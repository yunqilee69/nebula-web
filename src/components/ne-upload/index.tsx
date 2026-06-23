import { DeleteOutlined, FileOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Image, Progress, Typography, Upload, message, theme as antdTheme } from 'antd';
import type { UploadProps } from 'antd';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ListStorageFilesBySourceReq, StorageFileDetailResp, UploadTaskDetailResp } from '../../types/storage';
import type { NeImageUploadProps, NeUploadFile, NeUploadProps } from './types';

const defaultMaxCount = 1;

function createLocalUid(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '上传失败，请重试';
}

function mapTaskToFile(current: NeUploadFile, task: UploadTaskDetailResp): NeUploadFile {
  return {
    ...current,
    name: task.fileName || current.name,
    size: task.fileSize ?? current.size,
    mimeType: task.fileMimeType ?? current.mimeType,
    extension: task.fileExtension ?? current.extension,
    hash: task.fileHash ?? current.hash,
    taskId: task.id,
    status: 'done',
    percent: 100,
    errorMessage: undefined,
  };
}

function mapStorageFileToUploadFile(file: StorageFileDetailResp): NeUploadFile {
  const downloadUrl = `/api/storage/download?fileId=${encodeURIComponent(file.id)}&filename=${encodeURIComponent(file.fileName)}`;
  return {
    uid: file.id,
    name: file.fileName,
    size: file.fileSize,
    mimeType: file.fileMimeType,
    extension: file.fileExtension,
    fileId: file.id,
    taskId: file.uploadTaskId,
    hash: file.fileHash,
    url: downloadUrl,
    thumbUrl: file.fileMimeType?.startsWith('image/') ? downloadUrl : undefined,
    status: 'done',
    percent: 100,
  };
}

function buildSourceReq(sourceEntity?: string, sourceId?: string, sourceType?: string): ListStorageFilesBySourceReq | null {
  if (!sourceEntity || !sourceId) return null;
  const trimmedSourceType = sourceType?.trim();
  return trimmedSourceType ? { sourceEntity, sourceId, sourceType: trimmedSourceType } : { sourceEntity, sourceId };
}

export function limitFiles(files: NeUploadFile[], maxCount: number) {
  return files.slice(0, Math.max(0, maxCount));
}

interface NeUploadViewProps extends NeUploadProps {
  variant: 'file' | 'image';
  shape?: 'square' | 'circle';
  thumbnailSize?: number;
  preview?: boolean;
}

function NeUploadView({
  value,
  defaultValue,
  maxCount = defaultMaxCount,
  accept,
  disabled,
  sourceEntity,
  sourceId,
  sourceType,
  uploadText,
  helperText,
  className,
  style,
  uploadRequest,
  listBySource,
  deleteFile,
  onChange,
  onUploadSuccess,
  onUploadError,
  onRemove,
  onLimitExceeded,
  variant,
  shape = 'square',
  thumbnailSize = 96,
  preview = false,
}: NeUploadViewProps) {
  const { token } = antdTheme.useToken();
  const controlled = value !== undefined;
  const [internalFiles, setInternalFiles] = useState<NeUploadFile[]>(defaultValue ?? []);
  const files = controlled ? value : internalFiles;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pendingFilesRef = useRef(files);

  const visibleFiles = useMemo(() => limitFiles(files, maxCount), [files, maxCount]);
  const atLimit = visibleFiles.length >= maxCount;

  const applyUpdate = useCallback(
    (updater: (prev: NeUploadFile[]) => NeUploadFile[]) => {
      const nextFiles = limitFiles(updater(pendingFilesRef.current), maxCount);
      pendingFilesRef.current = nextFiles;
      if (!controlled) setInternalFiles(nextFiles);
      onChangeRef.current?.(nextFiles);
    },
    [controlled, maxCount],
  );

  useEffect(() => {
    const sourceReq = buildSourceReq(sourceEntity, sourceId, sourceType);
    if (!sourceReq || !listBySource) return;

    let active = true;
    listBySource(sourceReq)
      .then((items) => {
        if (!active) return;
        const backfilledFiles = items.map(mapStorageFileToUploadFile);
        const pendingFiles = pendingFilesRef.current.filter((f) => f.status === 'uploading' || f.status === 'error');
        const merged = limitFiles([...backfilledFiles, ...pendingFiles], maxCount);
        pendingFilesRef.current = merged;
        if (!controlled) setInternalFiles(merged);
        onChangeRef.current?.(merged);
      })
      .catch((error: unknown) => {
        void message.error(getErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [controlled, listBySource, maxCount, sourceEntity, sourceId, sourceType]);

  const removeFile = useCallback(
    async (file: NeUploadFile) => {
      if (deleteFile) await deleteFile(file);
      applyUpdate((prev) => prev.filter((item) => item.uid !== file.uid));
      onRemove?.(file);
    },
    [applyUpdate, deleteFile, onRemove],
  );

  const uploadOne = useCallback(
    async (file: File) => {
      const localFile: NeUploadFile = {
        uid: createLocalUid(file),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        status: 'uploading',
        percent: 0,
      };

      applyUpdate((prev) =>
        maxCount === 1 ? [localFile] : [...prev, localFile],
      );

      try {
        if (!uploadRequest) throw new Error('未配置上传方法');
        const task = await uploadRequest(file);
        const doneFile = mapTaskToFile(localFile, task);
        applyUpdate((prev) =>
          prev.map((item) => (item.uid === localFile.uid ? doneFile : item)),
        );
        onUploadSuccess?.(doneFile, task);
      } catch (error) {
        const errorFile: NeUploadFile = { ...localFile, status: 'error', errorMessage: getErrorMessage(error) };
        applyUpdate((prev) =>
          prev.map((item) => (item.uid === localFile.uid ? errorFile : item)),
        );
        onUploadError?.(errorFile, error);
      }
    },
    [applyUpdate, maxCount, onUploadError, onUploadSuccess, uploadRequest],
  );

  const visibleFilesRef = useRef(visibleFiles);
  visibleFilesRef.current = visibleFiles;

  const overflowBatchRef = useRef<File[] | null>(null);

  const beforeUpload: UploadProps['beforeUpload'] = (file, selectedFiles) => {
    const currentVisible = visibleFilesRef.current;
    const remaining = maxCount === 1 ? 1 : Math.max(0, maxCount - currentVisible.length);
    const allowedFiles = selectedFiles.slice(0, remaining);
    const overflowFiles = selectedFiles.slice(remaining);

    if (overflowFiles.length > 0 && overflowBatchRef.current !== selectedFiles) {
      overflowBatchRef.current = selectedFiles;
      onLimitExceeded?.(overflowFiles, maxCount);
      if (!onLimitExceeded) void message.warning(`最多只能上传 ${maxCount} 个文件`);
    }

    if (allowedFiles.includes(file)) void uploadOne(file);
    return Upload.LIST_IGNORE;
  };

  const uploadButton = (
    <Upload accept={accept} disabled={disabled} showUploadList={false} beforeUpload={beforeUpload} multiple={maxCount > 1}>
      {!atLimit ? (
        <Button aria-label={variant === 'image' ? '上传图片' : '上传附件'} icon={<PlusOutlined />} disabled={disabled}>
          {uploadText ?? (variant === 'image' ? '上传图片' : '上传附件')}
        </Button>
      ) : null}
    </Upload>
  );

  return (
    <Flex vertical gap={token.marginSM} className={className} style={style}>
      {variant === 'image' ? (
        <ImageUploadList
          files={visibleFiles}
          shape={shape}
          size={thumbnailSize}
          preview={preview}
          uploadButton={uploadButton}
          onRemove={removeFile}
          disabled={disabled}
        />
      ) : (
        <FileUploadList files={visibleFiles} uploadButton={uploadButton} onRemove={removeFile} disabled={disabled} />
      )}
      {helperText ? <Typography.Text type="secondary">{helperText}</Typography.Text> : null}
    </Flex>
  );
}

interface FileUploadListProps {
  files: NeUploadFile[];
  uploadButton: ReactNode;
  onRemove: (file: NeUploadFile) => void | Promise<void>;
  disabled?: boolean;
}

function FileUploadList({ files, uploadButton, onRemove, disabled }: FileUploadListProps) {
  const { token } = antdTheme.useToken();
  return (
    <Flex vertical gap={token.marginXS} role="list">
      {files.map((file) => (
        <Flex key={file.uid} role="listitem" align="center" gap={token.marginSM} style={{ padding: token.paddingSM, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG }}>
          <FileOutlined aria-hidden="true" />
          <Flex vertical style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text ellipsis>{file.name}</Typography.Text>
            {file.status === 'uploading' ? <Progress percent={file.percent ?? 0} size="small" /> : null}
            {file.status === 'error' ? <Typography.Text type="danger" role="alert">{file.errorMessage}</Typography.Text> : null}
          </Flex>
          <Button aria-label={`删除 ${file.name}`} type="text" icon={<DeleteOutlined />} disabled={disabled} onClick={() => void onRemove(file)} />
        </Flex>
      ))}
      {uploadButton}
    </Flex>
  );
}

interface ImageUploadListProps {
  files: NeUploadFile[];
  shape: 'square' | 'circle';
  size: number;
  preview: boolean;
  uploadButton: ReactNode;
  onRemove: (file: NeUploadFile) => void | Promise<void>;
  disabled?: boolean;
}

function ImageUploadList({ files, shape, size, preview, uploadButton, onRemove, disabled }: ImageUploadListProps) {
  const { token } = antdTheme.useToken();
  const radius = shape === 'circle' ? '50%' : token.borderRadiusLG;
  return (
    <Flex gap={token.marginSM} wrap role="list">
      {files.map((file) => (
        <div key={file.uid} role="listitem" style={{ width: size, position: 'relative' }}>
          <div style={{ width: size, height: size, overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: radius, background: token.colorFillAlter }}>
            {file.thumbUrl || file.url ? (
              <Image src={file.thumbUrl ?? file.url} alt={file.name} width={size} height={size} preview={preview} style={{ objectFit: 'cover' }} />
            ) : (
              <Flex align="center" justify="center" style={{ width: '100%', height: '100%' }} aria-label={`文件占位: ${file.name}`}>
                <FileOutlined aria-hidden="true" />
              </Flex>
            )}
          </div>
          <Button aria-label={`删除 ${file.name}`} type="text" size="small" icon={<DeleteOutlined />} disabled={disabled} onClick={() => void onRemove(file)} style={{ position: 'absolute', top: 4, right: 4, background: token.colorBgElevated }} />
        </div>
      ))}
      {uploadButton}
    </Flex>
  );
}

export function NeUpload(props: NeUploadProps) {
  return <NeUploadView {...props} variant="file" />;
}

export function NeImageUpload({
  accept = 'image/*',
  maxCount = defaultMaxCount,
  preview = true,
  ...rest
}: NeImageUploadProps) {
  return <NeUploadView {...rest} accept={accept} maxCount={maxCount} preview={preview} variant="image" />;
}

export type { NeImageUploadProps, NeUploadFile, NeUploadProps, NeUploadStatus } from './types';
