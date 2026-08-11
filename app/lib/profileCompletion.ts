export type ProfileCompletion = { percentage: number; missing: string[] };

export function getProfileCompletion(profile: {
  image?: string | null; country?: string | null; bio?: string | null;
  learnerProfile?: { city?: string | null; occupation?: string | null; preferredLanguage?: string | null; interests?: unknown[]; goals?: unknown[] } | null;
}): ProfileCompletion {
  const checks = [
    ["Profile photo", Boolean(profile.image)], ["Country", Boolean(profile.country)],
    ["Bio", Boolean(profile.bio)], ["City", Boolean(profile.learnerProfile?.city)],
    ["Occupation", Boolean(profile.learnerProfile?.occupation)], ["Language", Boolean(profile.learnerProfile?.preferredLanguage)],
    ["Learning interests", Boolean(profile.learnerProfile?.interests?.length)], ["Learning goals", Boolean(profile.learnerProfile?.goals?.length)],
  ] as const;
  const missing = checks.filter(([, complete]) => !complete).map(([label]) => label);
  return { percentage: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}
