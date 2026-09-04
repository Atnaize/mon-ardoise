import { getTranslations } from "next-intl/server";

import { PropertyTabs } from "@/components/property-tabs";
import { Link } from "@/i18n/navigation";

/**
 * Le retour à la liste, le nom du bien, puis les onglets. Les trois vues d'un bien
 * partagent cet en-tête, donc on ne s'y perd plus : le titre dit lequel, l'onglet
 * actif dit laquelle.
 */
export async function PropertyHeader({
  name,
  propertyId,
  hasLease,
  role,
}: {
  name: string;
  propertyId: string;
  hasLease: boolean;
  role: "owner" | "editor" | "viewer";
}) {
  const t = await getTranslations("property");

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/"
        className="w-fit text-[12.5px] text-ink-3 underline-offset-4 transition-colors hover:text-ink hover:underline"
      >
        ← {t("backToList")}
      </Link>
      <h1 className="m-0 font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {name}
      </h1>
      <PropertyTabs propertyId={propertyId} hasLease={hasLease} role={role} />
    </div>
  );
}
