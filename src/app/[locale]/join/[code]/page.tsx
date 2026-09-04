import { getTranslations } from "next-intl/server";

import { AppShell, PageTitle } from "@/components/app-shell";
import { SignInButton } from "@/components/sign-in-button";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";
import { invitationState, normalizeCode } from "@/lib/invitation";
import { currentUser } from "@/lib/session";
import { acceptInvitationAction } from "@/server/actions";
import { invitationByCode } from "@/server/members";

const ROLE_KEY = { owner: "roleOwner", editor: "roleEditor", viewer: "roleViewer" } as const;

/**
 * Le bout du lien d'invitation.
 *
 * Rien n'est consommé à l'ouverture : la page affiche ce qu'on propose, et
 * l'acceptation est un bouton. Un aperçu de message dans une boîte mail ne doit
 * pas brûler une invitation.
 */
export default async function JoinPage({ params }: PageProps<"/[locale]/join/[code]">) {
  const { locale, code } = await params;
  const t = await getTranslations("join");
  const tMembers = await getTranslations("members");
  const user = await currentUser();

  const offer = await invitationByCode(normalizeCode(code));
  const state = invitationState(offer, user?.email ?? null, new Date());

  if (state !== "ok" || !offer) {
    return (
      <AppShell>
        <PageTitle title={t("title")} intro={t(state)} />
        <div>
          <Link href="/">
            <Button variant="secondary">{t("back")}</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageTitle
        title={t("title")}
        intro={t("invited", { inviter: offer.inviterName, property: offer.propertyName })}
      />

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <Eyebrow>{tMembers("role")}</Eyebrow>
        <p className="text-sm text-ink">{tMembers(ROLE_KEY[offer.role])}</p>
        <p className="text-[12.5px] text-ink-3">{tMembers(`${ROLE_KEY[offer.role]}Hint`)}</p>
      </section>

      {user ? (
        <form action={acceptInvitationAction.bind(null, offer.code)}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit">{t("accept")}</Button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">{t("signIn")}</p>
          {/* Retour ici après Google : c'est sur cette page que l'invitation
              s'accepte, et le code est dans l'URL. */}
          <SignInButton callbackURL={`/${locale}/join/${offer.code}`} />
        </div>
      )}
    </AppShell>
  );
}
