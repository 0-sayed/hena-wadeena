import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileCheck, CheckCircle, XCircle, Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type ReviewTemplate = { id: string; name: string; content: string };
type ReviewDocument = {
  id: string;
  file_name: string;
  document_type: string;
  verified: boolean;
  verification_notes: string;
  created_at: string;
  file_url: string;
};

// Hardcoded stub data — will be replaced by real API calls in F10
const STUB_DOCUMENTS = [
  {
    id: 'd-001',
    file_name: 'هوية_أحمد.pdf',
    document_type: 'national_id',
    verified: true,
    verification_notes: 'مستند سليم',
    created_at: '2026-01-16T10:00:00Z',
    file_url: '#',
  },
  {
    id: 'd-002',
    file_name: 'رخصة_تجارية.pdf',
    document_type: 'business_license',
    verified: false,
    verification_notes: '',
    created_at: '2026-01-21T10:00:00Z',
    file_url: '#',
  },
  {
    id: 'd-003',
    file_name: 'شهادة_محمود.pdf',
    document_type: 'certificate',
    verified: false,
    verification_notes: '',
    created_at: '2026-02-02T10:00:00Z',
    file_url: '#',
  },
  {
    id: 'd-004',
    file_name: 'جواز_نورا.pdf',
    document_type: 'passport',
    verified: true,
    verification_notes: 'تم التحقق',
    created_at: '2026-02-15T10:00:00Z',
    file_url: '#',
  },
  {
    id: 'd-005',
    file_name: 'عقد_إيجار.pdf',
    document_type: 'lease_contract',
    verified: false,
    verification_notes: '',
    created_at: '2026-03-01T10:00:00Z',
    file_url: '#',
  },
];

export default function ReviewerDashboard() {
  const [documents, setDocuments] = useState<ReviewDocument[]>(STUB_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<ReviewDocument | null>(null);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [templates, setTemplates] = useState<ReviewTemplate[]>([
    { id: 'tpl-1', name: 'قبول كامل', content: 'المستند واضح ومطابق لشروط التسجيل.' },
    { id: 'tpl-2', name: 'نقص بيانات', content: 'المستند غير مكتمل، يرجى إعادة الرفع بجودة أعلى.' },
  ]);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');

  const stats = useMemo(
    () => ({
      pending: documents.filter((d) => !d.verified).length,
      verified: documents.filter((d) => d.verified).length,
      total: documents.length,
    }),
    [documents],
  );

  const updateDocumentStatus = (docId: string, verified: boolean) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, verified, verification_notes: notes } : d)),
    );
    toast.success(verified ? 'تم قبول المستند' : 'تم رفض المستند');
    setSelectedDoc(null);
    setNotes('');
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const statusOk =
        statusFilter === 'all' ||
        (statusFilter === 'verified' && doc.verified) ||
        (statusFilter === 'pending' && !doc.verified);
      const searchOk =
        doc.file_name.toLowerCase().includes(search.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(search.toLowerCase());
      return statusOk && searchOk;
    });
  }, [documents, statusFilter, search]);

  const addTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) return;
    setTemplates((prev) => [
      { id: `tpl-${Date.now()}`, name: templateName.trim(), content: templateContent.trim() },
      ...prev,
    ]);
    setTemplateName('');
    setTemplateContent('');
  };

  const removeTemplate = (id: string) => setTemplates((prev) => prev.filter((t) => t.id !== id));

  return (
    <Layout>
      <div className="container py-8 px-4 space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة تحكم المراجع</h1>
            <p className="text-muted-foreground">مراجعة المستندات + CRUD تجريبي لقوالب المراجعة</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">تم التحقق</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.verified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المستندات</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>المستندات المطلوب مراجعتها</CardTitle>
            <CardDescription>فلترة وبحث ومراجعة المستندات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="بحث بالاسم أو النوع"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="verified">موثق</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground flex items-center">
                النتائج: {filteredDocs.length}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الملف</TableHead>
                  <TableHead>نوع المستند</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الرفع</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.file_name}</TableCell>
                    <TableCell>{doc.document_type}</TableCell>
                    <TableCell>
                      <Badge variant={doc.verified ? 'default' : 'secondary'}>
                        {doc.verified ? 'موثق' : 'قيد المراجعة'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(doc.created_at).toLocaleDateString('ar')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setNotes(doc.verification_notes || '');
                          }}
                        >
                          مراجعة
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedDoc && (
          <Card>
            <CardHeader>
              <CardTitle>مراجعة المستند: {selectedDoc.file_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظاتك هنا..."
              />
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setNotes(tpl.content)}
                  >
                    {tpl.name}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => updateDocumentStatus(selectedDoc.id, true)}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  قبول
                </Button>
                <Button
                  onClick={() => updateDocumentStatus(selectedDoc.id, false)}
                  variant="destructive"
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  رفض
                </Button>
                <Button onClick={() => setSelectedDoc(null)} variant="outline">
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>قوالب ملاحظات المراجعة (CRUD تجريبي)</CardTitle>
            <CardDescription>إضافة وحذف قوالب لتسريع المراجعة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="اسم القالب"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Input
                placeholder="محتوى القالب"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
              />
              <Button onClick={addTemplate} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة قالب
              </Button>
            </div>
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{tpl.name}</p>
                    <p className="text-sm text-muted-foreground">{tpl.content}</p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => removeTemplate(tpl.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
