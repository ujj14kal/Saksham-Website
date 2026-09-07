import Image from "next/image";

/**
 * The government bodies behind the scheme.
 *
 * PM-AJAY's and NCVET's marks are used here; both come from their own sites,
 * and DoSJE's copyright policy allows reuse provided the source is
 * acknowledged, which the footer does.
 *
 * The Ministry and Department are named in words rather than shown with the
 * State Emblem of India. The emblem's use is restricted by law (State Emblem
 * of India (Prohibition of Improper Use) Act, 2005) to official government
 * bodies — this site is not one, so it must not display it.
 */
export function OfficialLogos() {
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
      <Image
        src="/logo-pmajay.png"
        alt="PM-AJAY — Pradhan Mantri Anusuchit Jaati Abhyuday Yojana"
        width={52}
        height={50}
        className="h-12 w-auto"
      />
      <Image
        src="/logo-ncvet.svg"
        alt="NCVET — National Council for Vocational Education and Training"
        width={44}
        height={48}
        className="h-11 w-auto"
      />
      <div className="text-xs leading-snug text-foreground-dim">
        <p className="font-semibold text-foreground">Ministry of Social Justice &amp; Empowerment</p>
        <p>Department of Social Justice &amp; Empowerment (DoSJE)</p>
        <p className="mt-0.5">Government of India</p>
      </div>
    </div>
  );
}
