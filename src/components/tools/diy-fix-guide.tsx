"use client";

import { useMemo, useState } from "react";
import { diyFixGuide, type DiyFixGuideInput, type DiyFixGuideOutput } from "@/ai/flows/diy-fix-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { Loader2, Wrench } from "lucide-react";

type DiyFixGuideInputSkillLevel = DiyFixGuideInput["skillLevel"];

const skillLevels: Array<{ value: DiyFixGuideInputSkillLevel; label: string; description: string }> = [
  { value: "beginner", label: "Beginner", description: "New to DIY repairs" },
  { value: "intermediate", label: "Intermediate", description: "Comfortable with common tools" },
  { value: "advanced", label: "Advanced", description: "Confident tackling complex fixes" },
];

export function DiyFixGuide() {
  const [issueDescription, setIssueDescription] = useState<string>("");
  const [locationContext, setLocationContext] = useState<string>("Kitchen sink cabinet");
  const [skillLevel, setSkillLevel] = useState<DiyFixGuideInputSkillLevel>("beginner");
  const [toolsInput, setToolsInput] = useState<string>("Adjustable wrench, plumber's tape, bucket");
  const [constraints, setConstraints] = useState<string>("Need a fix that works in an apartment with quiet hours");

  const [result, setResult] = useState<DiyFixGuideOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedIssue = issueDescription.trim();
  const trimmedLocation = locationContext.trim();
  const issueTooShort = trimmedIssue.length < 40;
  const locationTooShort = trimmedLocation.length > 0 && trimmedLocation.length < 3;

  const shareableGuide = useMemo(() => {
    if (!result) return "";

    const lines: string[] = [];
    lines.push(`DIY Fix Overview: ${result.overview}`);
    lines.push(`Difficulty: ${result.difficulty} | Estimated time: ${result.estimatedTime}`);
    lines.push("\nSafety Gear:");
    result.safetyGear.forEach((gear) => lines.push(`- ${gear}`));
    lines.push("\nSteps:");
    result.stepByStep.forEach((step, index) => {
      lines.push(`${index + 1}. ${step.title} - ${step.detail}${step.caution ? ` (Caution: ${step.caution})` : ""}`);
    });
    lines.push("\nValidation Checks:");
    result.validationChecks.forEach((check) => lines.push(`- ${check}`));
    lines.push("\nWhen to call a professional:");
    result.whenToCallProfessional.forEach((item) => lines.push(`- ${item}`));
    if (result.cleanupAndMaintenance.length > 0) {
      lines.push("\nCleanup & maintenance:");
      result.cleanupAndMaintenance.forEach((tip) => lines.push(`- ${tip}`));
    }
    return lines.join("\n");
  }, [result]);

  const handleGenerate = async () => {
    if (issueTooShort) {
      setError("Please provide more detail so we can build a safe repair plan.");
      return;
    }

    if (locationTooShort) {
      setError("Describe the location with at least 3 characters so we can tailor the fix.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const tools = toolsInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    try {
      const response = await diyFixGuide({
        issueDescription: trimmedIssue,
        locationContext: trimmedLocation.length >= 3 ? trimmedLocation : "General area",
        skillLevel,
        toolsAvailable: tools.length ? tools : undefined,
        constraints: constraints.trim() || undefined,
      });
      setResult(response);
    } catch (err: any) {
      let friendlyMessage = err?.message ?? "Something went wrong while creating your DIY plan.";

      if (Array.isArray(err?.issues) && err.issues[0]?.message) {
        friendlyMessage = err.issues[0].message;
      } else if (typeof friendlyMessage === "string") {
        try {
          const parsed = JSON.parse(friendlyMessage);
          if (Array.isArray(parsed) && parsed[0]?.message) {
            friendlyMessage = parsed[0].message;
          } else if (parsed?.message && Array.isArray(parsed?.issues) && parsed.issues[0]?.message) {
            friendlyMessage = parsed.issues[0].message;
          }
        } catch {
          // noop, fallback to existing message
        }
      }

      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(300px,340px),minmax(0,1fr)] xl:grid-cols-[minmax(320px,380px),minmax(0,1fr)]">
      <Card className="lg:sticky lg:top-24">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="issue-description">Describe the problem</Label>
            <Textarea
              id="issue-description"
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              placeholder="Explain what's broken, when it started happening, any noises, smells, leaks, or warning indicators..."
              className="min-h-[180px]"
            />
            <p className="text-xs text-muted-foreground">At least 40 characters so we can tailor the repair steps.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location-context">Location or surface</Label>
              <Input
                id="location-context"
                value={locationContext}
                onChange={(event) => setLocationContext(event.target.value)}
                placeholder="e.g., kitchen sink, bathroom drywall, balcony door"
              />
              <p className={locationTooShort ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {locationTooShort
                  ? "Enter at least 3 characters or leave blank to use a general location."
                  : "At least 3 characters helps us target the repair area."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-level">Skill level</Label>
              <Select value={skillLevel} onValueChange={(value) => setSkillLevel(value as DiyFixGuideInputSkillLevel)}>
                <SelectTrigger id="skill-level">
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  {skillLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex flex-col text-start">
                        <span className="font-medium">{level.label}</span>
                        <span className="text-xs text-muted-foreground">{level.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tools">Tools you already have (optional)</Label>
            <Textarea
              id="tools"
              value={toolsInput}
              onChange={(event) => setToolsInput(event.target.value)}
              placeholder="List or comma-separate tools e.g., screwdriver set, drill, voltage tester"
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="constraints">Constraints (optional)</Label>
            <Textarea
              id="constraints"
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="Mention time windows, budget caps, renter rules, or anything else we should factor in."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">We build a plan that matches your experience, tools, and safety needs.</div>
            <Button onClick={handleGenerate} disabled={loading || issueTooShort || locationTooShort} className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}Generate fix guide
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Unable to generate guide</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {result ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Plan overview</CardTitle>
                  <p className="text-sm text-muted-foreground">Safety, difficulty, and time at a glance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">{result.difficulty}</Badge>
                  <Badge variant="secondary">{result.estimatedTime}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{result.overview}</p>
                <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {result.safetyGear.map((gear) => (
                    <li key={gear} className="rounded-full border px-3 py-1">{gear}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Tools & materials</CardTitle>
                <CopyButton textToCopy={shareableGuide} tooltipText="Copy plan" />
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Tools</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {result.requiredTools.map((tool) => (
                      <li key={tool.name} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{tool.name}</span>
                          {tool.optional && <Badge variant="outline">Optional</Badge>}
                        </div>
                        {tool.alternative && (
                          <p className="text-xs text-muted-foreground">Alt: {tool.alternative}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">Materials</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {result.materials.map((material) => (
                      <li key={material} className="rounded-md border p-3 text-muted-foreground">{material}</li>
                    ))}
                  </ul>
                  <h3 className="mt-4 font-semibold">Preparation</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {result.preparation.map((prep, index) => (
                      <li key={`prep-${index}`}>{prep}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step-by-step walkthrough</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-3">
                  {result.stepByStep.map((step, index) => (
                    <li key={step.title} className="rounded-md border p-3">
                      <div className="flex items-baseline gap-3">
                        <span className="text-xl font-semibold text-primary">{index + 1}</span>
                        <div>
                          <p className="font-medium">{step.title}</p>
                          <p className="text-sm text-muted-foreground">{step.detail}</p>
                          {step.caution && step.caution.trim().length > 0 && (
                            <p className="mt-1 text-xs font-medium text-destructive">Caution: {step.caution}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle>Validation checks</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {result.validationChecks.map((item, index) => (
                      <li key={`validation-${index}`}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle>Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {result.troubleshooting.map((entry, index) => (
                    <div key={`troubleshoot-${index}`} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{entry.symptom}</p>
                      <p className="text-muted-foreground">Fix: {entry.fix}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle>When to call a pro</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {result.whenToCallProfessional.map((item, index) => (
                      <li key={`pro-${index}`}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Cleanup & maintenance</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {result.cleanupAndMaintenance.map((tip, index) => (
                    <li key={`cleanup-${index}`}>{tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : !loading ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center text-muted-foreground">
              <Wrench className="h-12 w-12" />
              <p>Describe what needs fixing, and we’ll craft a step-by-step plan with safety notes and tools.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
