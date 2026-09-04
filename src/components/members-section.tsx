import { getTranslations } from "next-intl/server";

import { ConfirmForm } from "@/components/forms/confirm-form";
import { InvitationForm } from "@/components/forms/invitation-form";
import { MemberForm } from "@/components/forms/member-form";
import { InvitationLink } from "@/components/invitation-link";
import { Section, SectionItem, SectionList } from "@/components/ui/section";
import { appUrl } from "@/lib/urls";
import { removeMemberAction, revokeInvitationAction } from "@/server/actions";
import { listMembers, pendingInvitations, type MemberView } from "@/server/members";

const ROLE_KEY = { owner: "roleOwner", editor: "roleEditor", viewer: "roleViewer" } as const;

/**
 * Une seule quote-part affichée quand les deux coïncident, ce qui est le cas
 * courant. Elles ne se séparent que si l'un finance plus qu'il ne détient, et
 * c'est précisément là qu'il faut le lire.
 */
function shareLabel(member: MemberView, t: (key: string, values?: Record<string, string>) => string) {
  const ownership = `${member.ownershipSharePermille / 10} %`;

  if (member.ownershipSharePermille === member.contributionSharePermille) {
    return ownership;
  }

  return `${ownership} · ${t("contributionShort", {
    share: `${member.contributionSharePermille / 10} %`,
  })}`;
}

export async function MembersSection({
  propertyId,
  locale,
  viewerId,
}: {
  propertyId: string;
  locale: string;
  viewerId: string;
}) {
  const t = await getTranslations("members");
  const [members, invitations] = await Promise.all([
    listMembers(propertyId),
    pendingInvitations(propertyId),
  ]);

  const owners = members.filter((member) => member.role === "owner");
  const ownershipTotal = members.reduce((sum, member) => sum + member.ownershipSharePermille, 0);

  return (
    <>
      <Section
        title={t("title")}
        hint={t("hint")}
        action={<InvitationForm propertyId={propertyId} locale={locale} label={t("invite")} />}
      >
        <SectionList>
          {members.map((member) => {
            const lastOwner = member.role === "owner" && owners.length === 1;

            return (
              <SectionItem
                key={member.id}
                title={
                  <>
                    {member.name}
                    {member.userId === viewerId ? (
                      <span className="ml-2 text-[11px] font-normal text-ink-3">{t("you")}</span>
                    ) : null}
                  </>
                }
                detail={`${t(ROLE_KEY[member.role])} · ${shareLabel(member, t)}`}
                actions={
                  <>
                    <MemberForm
                      propertyId={propertyId}
                      memberId={member.id}
                      locale={locale}
                      label={t("edit")}
                      defaults={member}
                      lockedToOwner={lastOwner}
                    />
                    {/* Le dernier propriétaire ne se retire pas : sans lui, plus
                        personne ne règle ni ne supprime le bien. */}
                    {lastOwner ? null : (
                      <ConfirmForm
                        action={removeMemberAction.bind(null, propertyId, member.id)}
                        locale={locale}
                        label={t("remove")}
                      />
                    )}
                  </>
                }
              />
            );
          })}
        </SectionList>

        {/* Le total ne bloque rien : entre l'invitation envoyée et la part fixée,
            il passe forcément sous les cent pour cent. Il le signale, c'est tout. */}
        <p className="text-[11.5px] text-ink-3">
          {ownershipTotal === 1000
            ? t("ownershipTotal", { total: `${ownershipTotal / 10} %` })
            : t("ownershipTotalOff", { total: `${ownershipTotal / 10} %` })}
        </p>
      </Section>

      <Section title={t("pendingTitle")} hint={t("pendingHint")}>
        {invitations.length === 0 ? (
          <p className="text-[13.5px] text-ink-3">{t("pendingEmpty")}</p>
        ) : (
          <SectionList>
            {invitations.map((entry) => (
              <SectionItem
                key={entry.id}
                title={<InvitationLink code={entry.code} url={appUrl(`/${locale}/join/${entry.code}`)} />}
                detail={`${t(ROLE_KEY[entry.role])} · ${
                  entry.email ? t("forEmail", { email: entry.email }) : t("forAnyone")
                } · ${t("expiresOn", {
                  date: entry.expiresAt.toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                  }),
                })}`}
                actions={
                  <ConfirmForm
                    action={revokeInvitationAction.bind(null, propertyId, entry.id)}
                    locale={locale}
                    label={t("revoke")}
                  />
                }
              />
            ))}
          </SectionList>
        )}
      </Section>
    </>
  );
}
