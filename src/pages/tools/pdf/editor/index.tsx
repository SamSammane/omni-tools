import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import ToolContent from '@components/ToolContent';
import ToolPdfInput from '@components/input/ToolPdfInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { ToolComponentProps } from '@tools/defineTool';
import { useTranslation } from 'react-i18next';
import PdfInlineEditor from './components/PdfInlineEditor';

export default function PdfEditor({ title }: ToolComponentProps) {
  const { t } = useTranslation('pdf');
  const [input, setInput] = useState<File | null>(null);
  const [result, setResult] = useState<File | null>(null);

  return (
    <ToolContent
      title={title}
      initialValues={{}}
      getGroups={null}
      input={input}
      setInput={setInput}
      inputComponent={
        <Box>
          <ToolPdfInput
            value={input}
            onChange={setInput}
            accept={['application/pdf']}
            title={t('editor.inputTitle')}
            hidePreview
          />
          {input && (
            <Box sx={{ mt: 2 }}>
              <PdfInlineEditor
                file={input}
                onSaved={(file) => setResult(file)}
              />
            </Box>
          )}
          {!input && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {t('editor.uploadHint')}
            </Typography>
          )}
        </Box>
      }
      resultComponent={
        result ? (
          <ToolFileResult
            title={t('editor.resultTitle')}
            value={result}
            extension="pdf"
          />
        ) : null
      }
      toolInfo={{
        title: t('editor.toolInfoTitle'),
        description: t('editor.toolInfoDescription')
      }}
      compute={() => {
        /* editing is interactive; save produces result */
      }}
    />
  );
}
