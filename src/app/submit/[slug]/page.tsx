import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProofSubmissionForm } from "@/components/proof-submission-form";
import { getCurrentViewer, getMissionBySlug } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function SubmitMissionProofPage({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getCurrentLocale();
  const { slug } = await params;
  const mission = await getMissionBySlug(slug);
  const viewer = await getCurrentViewer();

  if (!mission) {
    notFound();
  }

  if (viewer.configured && !viewer.user) {
    redirect(`/login?next=/submit/${mission.slug}`);
  }

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href={`/missions/${mission.slug}`} className="text-sm font-semibold text-cyan-300">
        {locale === "en" ? "← Back to mission details" : "← 返回任務詳情"}
      </Link>
      <div className="mt-6">
        <ProofSubmissionForm mission={mission} locale={locale} />
      </div>
    </section>
  );
}
