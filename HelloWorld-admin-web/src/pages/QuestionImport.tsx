/**
 * QuestionImport.tsx - 批量导入页面
 *
 * 上传 Excel/CSV 文件 → 后端预检查（错误行号/字段/原因）→ 确认导入。
 * 提供标准 CSV 模板下载。
 */

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Space, Upload, Table, Tag, Alert, Typography, App, Result, Spin,
} from 'antd'
import {
  ArrowLeftOutlined, UploadOutlined, CheckCircleOutlined,
  DownloadOutlined, FileExcelOutlined, ReloadOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { importQuestions } from '../api/admin'
import type { ImportReport, ImportErrorItem } from '../api/admin'

const { Title } = Typography

/** CSV 模板列头（与后端导入解析一致） */
const TEMPLATE_HEADER = [
  'title', 'slug', 'language_id', 'difficulty', 'question_type',
  'description', 'content', 'options', 'answer', 'explanation',
  'test_cases', 'starter_code', 'knowledge_tags', 'order',
]

/** 生成标准 CSV 模板并触发下载 */
function downloadTemplate() {
  const header = TEMPLATE_HEADER.join(',')
  const example =
    '示例题目,example-01,1,beginner,coding,题目描述,题目内容,[{"key":"A","text":"选项"}],,解析,[{"input":"1","expected":"1"}],print(1),循环;函数,0'
  const csv = `\uFEFF${header}\n${example}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'question_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function QuestionImport() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [checking, setChecking] = useState(false)
  const [importing, setImporting] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const fileRef = useRef<File | null>(null)

  /** 触发预检查 */
  const handleCheck = async (f: File) => {
    fileRef.current = f
    setFile(f)
    setImportedCount(null)
    setChecking(true)
    setReport(null)
    try {
      const res = await importQuestions(f, false)
      setReport(res)
      if (res.error_count === 0) {
        message.success(`预检查通过：共 ${res.valid_count} 条有效数据`)
      } else {
        message.warning(`预检查发现 ${res.error_count} 条错误`)
      }
    } catch {
      message.error('预检查失败，请检查文件格式')
      setReport(null)
    } finally {
      setChecking(false)
    }
  }

  /** 确认导入 */
  const handleConfirmImport = async () => {
    const f = fileRef.current
    if (!f) return
    setImporting(true)
    try {
      const res = await importQuestions(f, true)
      setReport(res)
      setImportedCount(res.valid_count)
      if (res.error_count > 0) {
        message.warning(`导入完成，${res.valid_count} 条成功，${res.error_count} 条失败`)
      } else {
        message.success(`成功导入 ${res.valid_count} 条题目`)
      }
    } catch {
      message.error('导入失败')
    } finally {
      setImporting(false)
    }
  }

  const uploadProps: UploadProps = {
    accept: '.csv,.xlsx,.xls',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (f) => {
      handleCheck(f as File)
      return false // 阻止自动上传，由预检查流程接管
    },
  }

  /** 错误表格列 */
  const errorColumns = [
    { title: '行号', dataIndex: 'row', width: 90 },
    { title: '字段', dataIndex: 'field', width: 160 },
    { title: '错误原因', dataIndex: 'message' },
  ]

  const hasError = (report?.error_count ?? 0) > 0

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/questions')}>
          返回题库
        </Button>
        <Title level={4} style={{ margin: 0 }}>批量导入题目</Title>
      </div>

      {/* 上传区 */}
      <Upload.Dragger {...uploadProps} style={{ padding: 8 }}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽 Excel / CSV 文件到此处</p>
        <p className="ant-upload-hint">
          支持 .csv / .xlsx / .xls 格式，第一行为表头（可下载模板参考）
        </p>
        {file && (
          <Tag color="blue" icon={<FileExcelOutlined />} style={{ marginTop: 8 }}>
            {file.name}
          </Tag>
        )}
      </Upload.Dragger>

      <Space style={{ marginTop: 16 }} wrap>
        <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
          下载导入模板
        </Button>
        {file && !checking && !importing && (
          <>
            <Button icon={<ReloadOutlined />} onClick={() => handleCheck(file)}>
              重新预检查
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={hasError}
              loading={importing}
              onClick={handleConfirmImport}
            >
              确认导入
            </Button>
          </>
        )}
      </Space>

      {/* 加载状态 */}
      {(checking || importing) && (
        <div style={{ textAlign: 'center', margin: '32px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>
            {checking ? '正在预检查文件...' : '正在导入数据...'}
          </div>
        </div>
      )}

      {/* 导入成功结果 */}
      {importedCount !== null && !hasError && (
        <Result
          status="success"
          title={`导入完成`}
          subTitle={`成功导入 ${importedCount} 条题目`}
          extra={[
            <Button type="primary" key="go" onClick={() => navigate('/questions')}>
              前往题库列表
            </Button>,
            <Button key="again" onClick={() => { setFile(null); setReport(null); setImportedCount(null) }}>
              继续导入
            </Button>,
          ]}
        />
      )}

      {/* 预检查报告 */}
      {report && importedCount === null && (
        <div style={{ marginTop: 24 }}>
          <Alert
            type={hasError ? 'warning' : 'success'}
            showIcon
            message={`预检查结果：共 ${report.total} 条，有效 ${report.valid_count} 条，错误 ${report.error_count} 条`}
            description={
              hasError
                ? '存在错误数据，请修正后重新上传；确认导入按钮在无错误时可用。'
                : '所有数据校验通过，可点击「确认导入」写入题库。'
            }
          />
          {report.errors.length > 0 && (
            <Table
              style={{ marginTop: 16 }}
              rowKey={(r: ImportErrorItem) => `${r.row}-${r.field}`}
              columns={errorColumns}
              dataSource={report.errors}
              pagination={false}
              size="small"
              locale={{ emptyText: '无错误' }}
              rowClassName={() => 'ant-table-row-error'}
            />
          )}
        </div>
      )}
    </Card>
  )
}