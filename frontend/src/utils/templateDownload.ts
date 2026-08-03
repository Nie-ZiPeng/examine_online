import { downloadTemplate } from '../api/exams';

export const downloadTemplateFile = async (format: 'excel' | 'word'): Promise<void> => {
  const blob = (await downloadTemplate(format)) as unknown as Blob;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = format === 'excel' ? 'question_import_template.xlsx' : 'question_import_template.docx';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
