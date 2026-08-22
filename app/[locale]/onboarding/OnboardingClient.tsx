"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";

type Category = { id: string; name: string };
const goals = ["Build foundational Islamic knowledge", "Improve Qur'an understanding", "Study Hadith", "Study Fiqh", "Learn at my own pace", "Follow structured learning", "Prepare for advanced study"];
type Form = { accountIntention: "LEARN" | "TEACH"; preferredLanguage: string; preferredDifficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; categoryIds: string[]; goals: string[]; phone: string };
const defaultForm: Form = { accountIntention: "LEARN", preferredLanguage: "en", preferredDifficulty: "BEGINNER", categoryIds: [], goals: [], phone: "" };

export default function OnboardingClient() {
  const { status, update: updateSession } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [navigating, setNavigating] = useState(false);
  const [form, setForm] = useState<Form>(defaultForm);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/${locale}/login?callbackUrl=/${locale}/onboarding`);
      return;
    }
    if (status !== "authenticated") return;
    // Don't re-fetch if we're in the middle of a final navigation
    if (navigating) return;

    void Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/learner-profile").then((r) => r.json())
    ]).then(([categoryResponse, profileResponse]) => {
      setCategories(categoryResponse.data ?? []);
      const profile = profileResponse.data;

      if (profile?.onboardingCompleted) {
        // Only redirect home if we're NOT in the middle of navigating away
        if (!navigating) router.replace(`/`);
        return;
      }

      if (profile) {
        setStep(profile.onboardingStep ?? 1);
        setForm({
          accountIntention: profile.accountIntention ?? "LEARN",
          preferredLanguage: profile.preferredLanguage ?? "en",
          preferredDifficulty: profile.preferredDifficulty ?? "BEGINNER",
          categoryIds: profile.interests?.map((item: { categoryId: string }) => item.categoryId) ?? [],
          goals: profile.goals?.map((item: { goal: string }) => item.goal) ?? [],
          phone: profile.phone ?? "",
        });
      }

      setReady(true);
    }).catch(() => setReady(true));
  }, [status, router, locale, navigating]);

  const toggle = (key: "categoryIds" | "goals", value: string) => {
    setSaveError("");
    setForm((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  };

  const saveStep = async (nextStep: number, complete = false) => {
    setSaving(true);
    setSaveError("");

    // Validate phone is required for learners (teachers provide it in the scholar application)
    if (step === 1 && form.accountIntention === "LEARN" && !form.phone.trim()) {
      setSaveError("Phone number is required.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/learner-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, onboardingStep: complete ? 3 : nextStep, onboardingCompleted: complete }),
      });
      const data = await response.json() as { success: boolean; error?: string };
      if (!data.success) {
        setSaveError(data.error ?? "Unable to save. Please try again.");
        return;
      }
      if (complete) {
        setNavigating(true);
        if (form.accountIntention === "TEACH") {
          // Refresh JWT then go to scholar application form
          await updateSession();
          router.push(`/${locale}/scholar-application`);
        } else {
          // Refresh JWT so middleware sees onboardingCompleted=true
          await updateSession();
          router.push(`/${locale}`);
        }
      } else {
        setStep(nextStep);
      }
    } catch {
      setSaveError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };
  if (status === "loading" || !ready) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[var(--accent-dim)] border-t-[var(--accent)] rounded-full animate-spin" />
    </div>
  );
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <p className="text-xs text-[var(--accent)] uppercase tracking-widest">Welcome to ILM · Step {step} of 3</p>
      <div className="h-1.5 bg-[var(--border)] rounded-full mt-3 mb-8">
        <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500" style={{ width: `${step * 33}%` }} />
      </div>
      
      {step === 1 && (
        <section className="glass-card rounded-2xl p-6 space-y-5">
          <h1 className="font-display text-2xl font-bold">How will you use ILM?</h1>
          <p className="text-sm text-[var(--text-muted)]">This personalises your experience. Choosing teaching starts an application; it does not grant instructor access automatically.</p>
          <div className="space-y-3">
            {([
              { value: "LEARN", label: "I want to learn", desc: "Access courses, track progress, earn certificates", icon: "📚" },
              { value: "TEACH", label: "I want to teach", desc: "Apply to become a scholar / instructor (requires admin approval)", icon: "🎓" },
            ] as const).map(({ value, label, desc, icon }) => (
              <label
                key={value}
                className={`flex gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  form.accountIntention === value
                    ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                <input
                  type="radio"
                  checked={form.accountIntention === value}
                  onChange={() => setForm({ ...form, accountIntention: value })}
                  className="accent-[var(--accent)] mt-1 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{icon} {label}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Phone number — only shown for learners (teachers provide it in the scholar application) */}
          {form.accountIntention === "LEARN" && (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 555 000 0000"
              className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Admins may use this to contact you about your account or application.
            </p>
          </div>
          )}

          <button className="btn-primary w-full" disabled={saving} onClick={() => void saveStep(2)}>
            {saving ? "Saving…" : "Continue →"}
          </button>
          {saveError && (
            <p className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
        </section>
      )}
      
      {step === 2 && (
        <section className="glass-card rounded-2xl p-6 space-y-5">
          <h1 className="font-display text-2xl font-bold">
            {form.accountIntention === "TEACH" ? "What subjects will you teach?" : "What would you like to study?"}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {form.accountIntention === "TEACH"
              ? "Select the Islamic subjects you plan to teach. This helps us match you with the right students."
              : "Select your areas of interest. We will recommend relevant courses and scholars."}
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => toggle("categoryIds", category.id)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  form.categoryIds.includes(category.id)
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="flex justify-between gap-3">
            <button className="btn-secondary flex-1" disabled={saving} onClick={() => void saveStep(1)}>← Back</button>
            <button className="btn-primary flex-1" disabled={saving} onClick={() => void saveStep(3)}>Continue →</button>
          </div>
          {saveError && (
            <p className="text-xs text-red-400 text-center mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
        </section>
      )}
      
      {step === 3 && (
        <section className="glass-card rounded-2xl p-6 space-y-5">
          <h1 className="font-display text-2xl font-bold">
            {form.accountIntention === "TEACH" ? "Your teaching preferences" : "Your learning preferences"}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {form.accountIntention === "TEACH"
              ? "Set the language you teach in and your typical student level."
              : "We will use these to personalise course recommendations."}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                {form.accountIntention === "TEACH" ? "Primary teaching language" : "Preferred language"}
              </label>
              <select className="input-themed" value={form.preferredLanguage} onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}>
                <option value="en">English</option>
                <option value="ar">Arabic (العربية)</option>
                <option value="ur">Urdu (اردو)</option>
                <option value="fr">French (Français)</option>
                <option value="tr">Turkish (Türkçe)</option>
                <option value="ms">Malay (Bahasa Melayu)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                {form.accountIntention === "TEACH" ? "Target student level" : "My current knowledge level"}
              </label>
              <select className="input-themed" value={form.preferredDifficulty} onChange={(e) => setForm({ ...form, preferredDifficulty: e.target.value as Form["preferredDifficulty"] })}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>

            {form.accountIntention === "LEARN" && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Learning goals</p>
                <div className="flex flex-wrap gap-2">
                  {goals.map((goal) => (
                    <button
                      type="button"
                      key={goal}
                      onClick={() => toggle("goals", goal)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                        form.goals.includes(goal)
                          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3">
            <button className="btn-secondary flex-1" disabled={saving} onClick={() => void saveStep(2)}>← Back</button>
            <button className="btn-primary flex-1" disabled={saving} onClick={() => void saveStep(3, true)}>
              {saving ? "Saving…" : form.accountIntention === "TEACH" ? "Continue to Application →" : "Finish Setup →"}
            </button>
          </div>
          {saveError && (
            <p className="text-xs text-red-400 text-center mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
        </section>
      )}
    </main>
  );
}