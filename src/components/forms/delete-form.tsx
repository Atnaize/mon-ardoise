import { Button } from "@/components/ui/button";

export function DeleteForm({
  action,
  locale,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  locale: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="danger" size="sm">
        {label}
      </Button>
    </form>
  );
}
