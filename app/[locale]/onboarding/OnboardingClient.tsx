"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";

type Category = { id: string; name: string };
const goals = ["Build foundational Islamic knowledge", "Improve Qur'an understanding", "Study Hadith", "Study Fiqh", "Learn at my own pace", "Follow structured learning", "Prepare for advanced study"];
type Form = { accountIntention: "LEARN" | "TEACH"; preferredLanguage: string; preferredDifficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; categoryIds: string[]; goals: string[] };
const defaultForm: Form = { accountIntention: "LEARN", preferredLanguage: "en", preferredDifficulty: "BEGINNER", categoryIds: [], goals: [] };

export default function OnboardingClient() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<Form>(defaultForm);
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/${locale}/login?callbackUrl=/${locale}/onboarding`);
      return;
    }
    if (status !== "authenticated") return;

    void Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/learner-profile").then((r) => r.json())
    ]).then(([categoryResponse, profileResponse]) => {
      setCategories(categoryResponse.data ?? []);
      const profile = profileResponse.data;

      if (profile?.onboardingCompleted) {
        // Use role-based redirect for proper routing
        fetch("/api/auth/redirect")
          .then(res => res.json())
          .then(data => {
            router.replace(data.destination || `/${locale}/dashboard`);
          })
          .catch(() => router.replace(`/${locale}/dashboard`));
        return;
      }

      if (profile) {
        setStep(profile.onboardingStep ?? 1);
        setForm({
          accountIntention: profile.accountIntention ?? "LEARN",
          preferredLanguage: profile.preferredLanguage ?? "en",
          preferredDifficulty: profile.preferredDifficulty ?? "BEGINNER",
          categoryIds: profile.interests?.map((item: { categoryId: string }) => item.categoryId) ?? [],
          goals: profile.goals?.map((item: { goal: string }) => item.goal) ?? []
        });
      }

      setReady(true);
    }).catch(() => setReady(true));
  }, [status, router, locale]);
  const toggle = (key: "categoryIds" | "goals", value: string) => setForm((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  const saveStep = async (nextStep: number, complete = false) => { 
    setSaving(true); 
    try { 
      const response = await fetch("/api/learner-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, onboardingStep: complete ? 3 : nextStep, onboardingCompleted: complete }) }); 
      const data = await response.json(); 
      if (!data.success) throw new Error(data.error ?? "Unable to save progress"); 
      if (complete) { 
        if (form.accountIntention === "TEACH") { 
          router.push(`/${locale}/scholar-application`); 
        } else { 
          // Use the role-based redirect API for proper routing
          const redirectResponse = await fetch("/api/auth/redirect"); 
          const redirectData = await redirectResponse.json(); 
          router.push(redirectData.destination || `/${locale}/dashboard`); 
        } 
      } else setStep(nextStep); 
    } finally { 
      setSaving(false); 
    } 
  };
  if (status === "loading" || !ready) return null;
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <p className="text-xs text-[var(--accent)] uppercase tracking-widest">Welcome to ILM · Step {step} of 3</p>
      <div className="h-1.5 bg-[var(--border)] rounded-full mt-3 mb-8">
        <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${step * 33}%` }} />
      </div>
      
      {step === 1 && (
        <section className="glass-card rounded-2xl p-6 space-y-5">
          <h1 className="font-display text-2xl font-bold">How will you use ILM?</h1>
          <p className="text-sm text-[var(--text-muted)]">Choosing teaching starts an application; it does not grant instructor access.</p>
          {[["LEARN", "I want to learn"], ["TEACH", "I want to teach"]].map(([value, label]) => (
            <label key={value} className="flex gap-3 p-4 border border-[var(--border)] rounded-xl cursor-pointer">
              <input type="radio" checked={form.accountIntention === value} onChange={() => setForm({ ...form, accountIntention: value as Form["accountIntention"] })} />
              {label}
            </label>
          ))}
          <button className="btn-primary" disabled={saving} onClick={() => void saveStep(2)}>Continue</button>
        </section>
      )}
      
      {step === 2 && (
        <section className="glass-card rounded-2xl p-6 space-y-5">
          <h1 className="font-display text-2xl font-bold">What would you like to study?</h1>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button type="button" key={category.id} onClick={() => toggle("categoryIds", category.id)} className={`px-3 py-2 rounded-lg text-sm border ${form.categoryIds.includes(category.id) ? "bg-[var(--accent)] text-white" : "border-[var(--border)]"}`}>
                {category.name}
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <button className="btn-secondary" disabled={saving} onClick={() => void saveStep(1)}>Back</button>
            <button className="btn-primary" disabled={saving} onClick={() => void saveStep(3)}>Continue</button>
          </div>
        </section>
      )}
      
      {step === 3 && (
        <section className="glass-card rounded-2xl p-6 space-y-5">
          <h1 className="font-display text-2xl font-bold">Set your learning preferences</h1>
          <select className="input-themed" value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value })}>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="ur">Urdu</option>
          </select>
          <select className="input-themed" value={form.preferredDifficulty} onChange={(event) => setForm({ ...form, preferredDifficulty: event.target.value as Form["preferredDifficulty"] })}>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
          <div className="flex flex-wrap gap-2">
            {goals.map((goal) => (
              <button type="button" key={goal} onClick={() => toggle("goals", goal)} className={`px-3 py-2 rounded-lg text-sm border ${form.goals.includes(goal) ? "bg-[var(--accent)] text-white" : "border-[var(--border)]"}`}>
                {goal}
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <button className="btn-secondary" disabled={saving} onClick={() => void saveStep(2)}>Back</button>
            <button className="btn-primary" disabled={saving} onClick={() => void saveStep(3, true)}>
              {saving ? "Saving…" : form.accountIntention === "TEACH" ? "Continue to application" : "Finish"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}