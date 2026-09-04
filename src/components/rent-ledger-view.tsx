import { getTranslations } from "next-intl/server";

import { DeleteForm } from "@/components/forms/delete-form";
import { RentPaymentForm } from "@/components/forms/rent-payment-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { centsToEuros } from "@/engine/money";
import type { RentLedger, RentStatus } from "@/engine/rent-ledger";
import { money, monthLabel } from "@/lib/format";
import { deleteRentPaymentAction } from "@/server/actions";

const STATUS_TONE: Record<RentStatus, "positive" | "negative" | "warning" | "accent" | "neutral"> = {
  paid: "positive",
  overpaid: "accent",
  partial: "warning",
  overdue: "negative",
  upcoming: "neutral",
};

export async function RentLedgerView({
  ledger,
  propertyId,
  leaseId,
  locale,
  today,
  canEdit,
}: {
  ledger: RentLedger;
  propertyId: string;
  leaseId: string | null;
  locale: string;
  today: string;
  /** Un lecteur voit l'ardoise sans pouvoir pointer un versement. */
  canEdit: boolean;
}) {
  const t = await getTranslations("rent");

  return (
    <ul className="flex flex-col gap-2.5">
      {ledger.rows.map((row) => (
        <li key={row.month}>
          <Card className={row.status === "overdue" ? "border-negative" : undefined}>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="font-display text-base font-semibold tracking-tight text-ink">
                  {monthLabel(row.month, locale)}
                </span>
                <Badge tone={STATUS_TONE[row.status]}>{t(`status.${row.status}`)}</Badge>
              </div>

              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-ink-3">{t("expected")}</dt>
                  <dd className="tabular-nums text-ink-2">{money(row.expected, locale)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-3">{t("received")}</dt>
                  <dd className="tabular-nums text-ink-2">{money(row.received, locale)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-3">{t("balance")}</dt>
                  <dd
                    className={`font-medium tabular-nums ${
                      row.balance > 0 ? "text-negative" : row.balance < 0 ? "text-accent" : "text-positive"
                    }`}
                  >
                    {money(row.balance, locale)}
                  </dd>
                </div>
              </dl>

              {row.payments.length > 0 ? (
                <ul className="flex flex-col gap-1.5 border-t border-line-soft pt-2.5">
                  {row.payments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm tabular-nums text-ink-2">
                        {money(payment.amount, locale)} · {payment.date}
                      </span>
                      <div className="flex items-center gap-2">
                        {canEdit ? (
                          <>
                            <RentPaymentForm
                              propertyId={propertyId}
                              entryId={payment.id}
                              dueMonth={row.month}
                              leaseId={leaseId}
                              suggestedAmount={String(centsToEuros(payment.amount))}
                              today={payment.date}
                              locale={locale}
                              label={t("editPayment")}
                            />
                            <DeleteForm
                              action={deleteRentPaymentAction.bind(null, propertyId, payment.id)}
                              locale={locale}
                              label={t("deletePayment")}
                            />
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {canEdit && row.balance > 0 ? (
                <div className="flex border-t border-line-soft pt-2.5">
                  <RentPaymentForm
                    propertyId={propertyId}
                    dueMonth={row.month}
                    leaseId={leaseId}
                    suggestedAmount={String(centsToEuros(row.balance))}
                    today={today}
                    locale={locale}
                    label={t("record")}
                  />
                </div>
              ) : null}
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
