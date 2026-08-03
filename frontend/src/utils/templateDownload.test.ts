import { downloadTemplateFile } from './templateDownload';
import { downloadTemplate } from '../api/exams';

jest.mock('../api/exams', () => ({
  downloadTemplate: jest.fn(),
}));

const mockDownloadTemplate = downloadTemplate as jest.Mock;

describe('downloadTemplateFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.URL.createObjectURL = jest.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = jest.fn();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('下载 excel 模板且文件名为 .xlsx', async () => {
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    mockDownloadTemplate.mockResolvedValue(new Blob(['x']));

    await downloadTemplateFile('excel');

    expect(downloadTemplate).toHaveBeenCalledWith('excel');
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const anchor = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement | undefined;
    expect(anchor?.download).toBe('question_import_template.xlsx');
  });

  it('下载 word 模板且文件名为 .docx', async () => {
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    mockDownloadTemplate.mockResolvedValue(new Blob(['x']));

    await downloadTemplateFile('word');

    const anchor = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement | undefined;
    expect(anchor?.download).toBe('question_import_template.docx');
  });

  it('点击后清理临时 a 标签与 object URL', async () => {
    mockDownloadTemplate.mockResolvedValue(new Blob(['x']));

    await downloadTemplateFile('excel');

    expect(document.querySelector('a[download="question_import_template.xlsx"]')).toBeNull();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('接口失败时向上抛出错误', async () => {
    mockDownloadTemplate.mockRejectedValue(new Error('network error'));

    await expect(downloadTemplateFile('excel')).rejects.toThrow('network error');
  });
});
