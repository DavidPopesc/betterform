"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCheck, Copy, Download, Link2, Pencil, Plus, Trash2, X } from "lucide-react";

type Field = {
  id: string;
  type: string;
  label: string;
  options?: Array<{ id: string; label: string }>;
};

type FormLink = {
  id: string;
  label: string;
  values: Record<string, unknown>;
  hiddenFieldIds: string[];
  expiresAt: string | null;
  createdAt: string;
  expired: boolean;
  responseCount?: number;
};

type PrefillRow = { fieldId: string; value: string | string[]; hidden: boolean };

type Draft = { label: string; prefills: PrefillRow[]; expiresAt: string };

const EMPTY_DRAFT: Draft = { label: "", prefills: [], expiresAt: "" };
const NOT_PREFILLABLE = ["text", "section", "legal_text", "file_upload", "signature"];

// <input type="datetime-local"> works in local time without a zone; convert both ways.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function describeValue(field: Field | undefined, value: unknown) {
  const labelFor = (id: unknown) => field?.options?.find((option) => option.id === id)?.label ?? String(id);
  if (Array.isArray(value)) return value.map(labelFor).join(", ");
  return field?.options?.length ? labelFor(value) : String(value);
}

export default function UniqueLinksCard({ formId, fields }: { formId: string; fields: Field[] }) {
  const [links, setLinks] = React.useState<FormLink[]>([]);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const prefillableFields = fields.filter((field) => !NOT_PREFILLABLE.includes(field.type));
  const fieldById = (id: string) => fields.find((field) => field.id === id);

  const load = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/forms/${formId}/sharing`);
      if (!response.ok) return;
      const data = await response.json();
      setLinks(data.links || []);
    } catch (err) {
      console.error("Failed to load unique links:", err);
    }
  }, [formId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const linkUrl = (id: string) => `${window.location.origin}/f/${id}`;
  const qrUrl = (id: string) => `/api/qr?data=${encodeURIComponent(linkUrl(id))}`;

  const updatePrefill = (index: number, patch: Partial<PrefillRow>) =>
    setDraft((current) => ({
      ...current,
      prefills: current.prefills.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setError("");
  };

  const startEditing = (link: FormLink) => {
    setEditingId(link.id);
    setError("");
    setDraft({
      label: link.label,
      expiresAt: toLocalInput(link.expiresAt),
      prefills: Object.entries(link.values).map(([fieldId, value]) => ({
        fieldId,
        value: Array.isArray(value) ? value.map(String) : String(value),
        hidden: link.hiddenFieldIds.includes(fieldId),
      })),
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const values: Record<string, unknown> = {};
    const hiddenFieldIds: string[] = [];
    for (const row of draft.prefills) {
      if (!row.fieldId) continue;
      values[row.fieldId] = row.value;
      if (row.hidden) hiddenFieldIds.push(row.fieldId);
    }

    try {
      const response = await fetch(`/api/forms/${formId}/sharing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingId ? "update_link" : "create_link",
          linkId: editingId,
          label: draft.label,
          values,
          hiddenFieldIds,
          expiresAt: fromLocalInput(draft.expiresAt),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not save the link.");
      resetDraft();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the link.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (link: FormLink) => {
    if (!window.confirm(`Delete "${link.label}"? The link will stop working. Its responses keep the label.`)) return;
    await fetch(`/api/forms/${formId}/sharing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_link", linkId: link.id }),
    });
    if (editingId === link.id) resetDraft();
    await load();
  };

  const copy = async (id: string) => {
    await navigator.clipboard.writeText(linkUrl(id));
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
  };

  const downloadQr = async (link: FormLink) => {
    try {
      const response = await fetch(qrUrl(link.id));
      if (!response.ok) throw new Error("QR generation failed");
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${link.label.replace(/[\\/:*?"<>|]+/g, "-")}-Better Form.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download QR code:", err);
    }
  };

  const usedFieldIds = new Set(draft.prefills.map((row) => row.fieldId));

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Link2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Unique links</h4>
            <p className="text-sm text-muted-foreground">
              Give each person or group their own link. Responses show which link they came from. You can prefill
              answers, hide prefilled questions, and set an expiry. To respondents it looks like the regular form.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Label</span>
                <Input
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder="e.g. Jane Smith, Table 4, Newsletter"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Expires</span>
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={draft.expiresAt}
                    onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
                  />
                  {draft.expiresAt ? (
                    <Button type="button" variant="ghost" size="icon" aria-label="Never expires" onClick={() => setDraft({ ...draft, expiresAt: "" })}>
                      <X className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
                {!draft.expiresAt ? <span className="text-xs text-muted-foreground">Leave empty to never expire.</span> : null}
              </label>
            </div>

            {draft.prefills.map((row, index) => {
              const field = fieldById(row.fieldId);
              return (
                <div key={index} className="grid gap-2 rounded-md bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
                  <select
                    value={row.fieldId}
                    onChange={(e) => {
                      const next = fieldById(e.target.value);
                      updatePrefill(index, { fieldId: e.target.value, value: next?.type === "checkboxes" ? [] : "" });
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    aria-label="Question to prefill"
                  >
                    <option value="">Choose a question</option>
                    {prefillableFields
                      .filter((option) => option.id === row.fieldId || !usedFieldIds.has(option.id))
                      .map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                  </select>

                  {field?.type === "checkboxes" ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      {field.options?.map((option) => {
                        const selected = Array.isArray(row.value) ? row.value : [];
                        return (
                          <label key={option.id} className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={selected.includes(option.id)}
                              onChange={(e) =>
                                updatePrefill(index, {
                                  value: e.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id),
                                })
                              }
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                  ) : field?.options?.length ? (
                    <select
                      value={String(row.value)}
                      onChange={(e) => updatePrefill(index, { value: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      aria-label="Prefilled answer"
                    >
                      <option value="">Choose an answer</option>
                      {field.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={String(row.value)}
                      onChange={(e) => updatePrefill(index, { value: e.target.value })}
                      placeholder="Prefilled answer"
                      disabled={!field}
                    />
                  )}

                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={row.hidden} onChange={(e) => updatePrefill(index, { hidden: e.target.checked })} />
                    Hide question
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove prefilled answer"
                    onClick={() => setDraft({ ...draft, prefills: draft.prefills.filter((_, i) => i !== index) })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}

            {draft.prefills.length < prefillableFields.length ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDraft({ ...draft, prefills: [...draft.prefills, { fieldId: "", value: "", hidden: true }] })}
              >
                <Plus className="w-4 h-4 mr-1" />
                Prefill an answer
              </Button>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex gap-2">
              <Button onClick={save} disabled={!draft.label.trim() || saving}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Create unique link"}
              </Button>
              {editingId ? (
                <Button variant="outline" onClick={resetDraft}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>

          {links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link) => {
                const prefillEntries = Object.entries(link.values);
                return (
                  <div key={link.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 md:flex-row md:items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl(link.id)} alt={`${link.label} QR code`} className="h-24 w-24 shrink-0 rounded-md border border-slate-200 bg-white p-1" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{link.label}</span>
                        {link.expired ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Expired</span>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {link.responseCount ?? 0} {link.responseCount === 1 ? "response" : "responses"}
                        {" · "}
                        {link.expiresAt
                          ? `${link.expired ? "Expired" : "Expires"} ${new Date(link.expiresAt).toLocaleString()}`
                          : "Never expires"}
                      </div>
                      {prefillEntries.length > 0 ? (
                        <ul className="text-sm text-slate-600">
                          {prefillEntries.map(([fieldId, value]) => {
                            const field = fieldById(fieldId);
                            return (
                              <li key={fieldId} className="truncate">
                                {field?.label ?? "Deleted question"}: {describeValue(field, value)}
                                {link.hiddenFieldIds.includes(fieldId) ? " (hidden)" : ""}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button size="sm" variant={copiedId === link.id ? "default" : "outline"} onClick={() => copy(link.id)}>
                          {copiedId === link.id ? <CheckCheck className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                          {copiedId === link.id ? "Copied" : "Copy link"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => downloadQr(link)}>
                          <Download className="w-4 h-4 mr-1" />
                          QR code
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEditing(link)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => remove(link)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
