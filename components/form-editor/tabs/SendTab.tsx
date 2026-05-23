"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCheck, Code, Copy, Download, Link2, Mail, Share2, Trash2 } from "lucide-react";

type Field = {
  id: string;
  type: string;
  label: string;
  options?: Array<{ id: string; label: string }>;
};

type PrefillLink = {
  id: string;
  name: string;
  values: Record<string, unknown>;
  hiddenFieldIds: string[];
  createdAt: string;
};

interface SendTabProps {
  formId: string;
  publicId: string;
  formName: string;
  fields: Field[];
}

export default function SendTab({ formId, publicId, formName, fields }: SendTabProps) {
  const [copied, setCopied] = React.useState(false);
  const [embedCopied, setEmbedCopied] = React.useState(false);
  const [prefills, setPrefills] = React.useState<PrefillLink[]>([]);
  const [prefillName, setPrefillName] = React.useState("");
  const [prefillFieldId, setPrefillFieldId] = React.useState("");
  const [prefillValue, setPrefillValue] = React.useState("");
  const [hidePrefilledField, setHidePrefilledField] = React.useState(true);
  const [isCreatingPrefill, setIsCreatingPrefill] = React.useState(false);

  const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/f/${publicId}`;
  const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  const qrImageUrl = `/api/qr?data=${encodeURIComponent(formUrl)}`;
  const safeFormName = (formName || "Untitled form").trim().replace(/[\\/:*?"<>|]+/g, "-");
  const qrFileName = `${safeFormName}-Better Form.png`;
  const prefillableFields = fields.filter((field) => !["text", "section", "file_upload"].includes(field.type));
  const selectedPrefillField = prefillableFields.find((field) => field.id === prefillFieldId);

  const loadSharing = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/forms/${formId}/sharing`);
      if (!response.ok) return;
      const data = await response.json();
      setPrefills(data.prefills || []);
    } catch (error) {
      console.error("Failed to load sharing config:", error);
    }
  }, [formId]);

  React.useEffect(() => {
    void loadSharing();
  }, [loadSharing]);

  const copyLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const downloadQR = async () => {
    try {
      const response = await fetch(qrImageUrl);
      if (!response.ok) throw new Error("QR generation failed");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = qrFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download QR code:", error);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent("Fill out this form");
    const body = encodeURIComponent(`Please fill out this form: ${formUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Form",
          text: "Please fill out this form",
          url: formUrl,
        });
      } catch {
        console.log("Share cancelled");
      }
    }
  };

  const createPrefill = async () => {
    if (!prefillFieldId || !prefillValue.trim()) return;

    setIsCreatingPrefill(true);
    try {
      const response = await fetch(`/api/forms/${formId}/sharing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_prefill",
          name: prefillName || `Prefilled ${selectedPrefillField?.label || "link"}`,
          values: {
            [prefillFieldId]: prefillValue,
          },
          hiddenFieldIds: hidePrefilledField ? [prefillFieldId] : [],
        }),
      });
      if (!response.ok) throw new Error("Failed to create prefill");

      await loadSharing();
      setPrefillName("");
      setPrefillFieldId("");
      setPrefillValue("");
      setHidePrefilledField(true);
    } catch (error) {
      console.error("Failed to create prefill:", error);
    } finally {
      setIsCreatingPrefill(false);
    }
  };

  const copyPrefillLink = async (prefillId: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/f/${prefillId}`);
  };

  const deletePrefill = async (prefillId: string) => {
    const confirmed = window.confirm("Delete this pre-filled link?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/forms/${formId}/sharing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_prefill",
          prefillId,
        }),
      });
      if (!response.ok) throw new Error("Failed to delete prefill");
      await loadSharing();
    } catch (error) {
      console.error("Failed to delete prefill:", error);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">Send & Share</h3>
          <p className="text-sm text-muted-foreground">
            Share your form, or generate pre-filled links for private workflows.
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Pre-filled Link</h4>
                <p className="text-sm text-muted-foreground">
                  Lock in a field value ahead of time and optionally hide that field from respondents.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input value={prefillName} onChange={(e) => setPrefillName(e.target.value)} placeholder="Link name" />
                <select
                  value={prefillFieldId}
                  onChange={(e) => {
                    setPrefillFieldId(e.target.value);
                    setPrefillValue("");
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose a field</option>
                  {prefillableFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPrefillField ? (
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  {selectedPrefillField.options && selectedPrefillField.options.length > 0 ? (
                    <select
                      value={prefillValue}
                      onChange={(e) => setPrefillValue(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Choose a value</option>
                      {selectedPrefillField.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input value={prefillValue} onChange={(e) => setPrefillValue(e.target.value)} placeholder="Prefilled value" />
                  )}

                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={hidePrefilledField}
                      onChange={(e) => setHidePrefilledField(e.target.checked)}
                    />
                    Hide field
                  </label>
                </div>
              ) : null}

              <Button onClick={createPrefill} disabled={!prefillFieldId || !prefillValue.trim() || isCreatingPrefill}>
                {isCreatingPrefill ? "Creating..." : "Create pre-filled link"}
              </Button>

              {prefills.length > 0 ? (
                <div className="space-y-3 border-t pt-4">
                  {prefills.map((prefill) => (
                    <div
                      key={prefill.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="font-medium">{prefill.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(prefill.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => copyPrefillLink(prefill.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy link
                        </Button>
                        <Button variant="outline" onClick={() => deletePrefill(prefill.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Copy className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">Direct Link</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Copy and share the link to your form
              </p>
              <div className="flex gap-2">
                <Input value={formUrl} readOnly className="flex-1 font-mono text-sm" />
                <Button onClick={copyLink} variant={copied ? "default" : "outline"}>
                  {copied ? (
                    <>
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">QR Code</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Download a QR code for print materials, posters, or flyers
              </p>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrImageUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <Button onClick={downloadQR} variant="outline" className="md:self-start">
                    <Download className="w-4 h-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Code className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">Embed in Website</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Embed this form directly into your website with an iframe
              </p>
              <div className="space-y-3">
                <div className="bg-slate-900 text-slate-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
                  {embedCode}
                </div>
                <Button onClick={copyEmbedCode} variant={embedCopied ? "default" : "outline"}>
                  {embedCopied ? (
                    <>
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Embed Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">More Options</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Share via email or other platforms
              </p>
              <div className="flex gap-2">
                <Button onClick={shareViaEmail} variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Share via Email
                </Button>
                {typeof window !== "undefined" && "share" in navigator ? (
                  <Button onClick={shareNative} variant="outline">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
