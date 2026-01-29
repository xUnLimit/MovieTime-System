'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTemplatesMensajesStore } from '@/store/templatesMensajesStore';
import { ModuleErrorBoundary } from '@/components/shared/ModuleErrorBoundary';
import { TemplateEditor } from '@/components/editor-mensajes/TemplateEditor';

function EditorMensajesPageContent() {
  const { templates, fetchTemplates } = useTemplatesMensajesStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editor de Mensajes de WhatsApp</h1>
        <div className="flex items-center gap-2 text-sm mt-1">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">Editor de Mensajes</span>
        </div>
      </div>

      <TemplateEditor templates={templates} />
    </div>
  );
}

export default function EditorMensajesPage() {
  return (
    <ModuleErrorBoundary moduleName="Editor de Mensajes">
      <EditorMensajesPageContent />
    </ModuleErrorBoundary>
  );
}
