import React, { useRef } from 'react';
import { Typography } from '@mui/material';
import BaseFileInput from './BaseFileInput';
import { BaseFileInputProps } from './file-input-utils';
import { isArray } from 'lodash';

interface PdfFileInputProps extends BaseFileInputProps {
  /** Skip iframe preview (avoids loading the PDF twice in the editor). */
  hidePreview?: boolean;
}

export default function ToolPdfInput({
  hidePreview,
  value,
  ...props
}: PdfFileInputProps) {
  const pdfRef = useRef<HTMLIFrameElement>(null);
  const fileName = value && !isArray(value) ? value.name : null;

  return (
    <BaseFileInput {...props} value={value} type={'pdf'}>
      {({ preview }) =>
        hidePreview && preview ? (
          <Typography variant="body2" sx={{ p: 2 }}>
            {fileName}
          </Typography>
        ) : (
          <iframe
            ref={pdfRef}
            src={preview}
            width="100%"
            height="100%"
            style={{ maxWidth: '500px' }}
          />
        )
      }
    </BaseFileInput>
  );
}
