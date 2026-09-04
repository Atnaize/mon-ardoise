import { describe, expect, it } from "vitest";

import {
  CODE_LENGTH,
  formatCode,
  invitationState,
  inviteCode,
  normalizeCode,
} from "./invitation";

const AMBIGUOUS = /[OIL01]/;
const NOW = new Date("2026-09-04T12:00:00Z");

function offer(overrides: Partial<Parameters<typeof invitationState>[0]> = {}) {
  return {
    expiresAt: new Date("2026-09-18T12:00:00Z"),
    acceptedAt: null,
    email: null,
    ...overrides,
  };
}

describe("inviteCode", () => {
  it("tire douze caractères", () => {
    expect(inviteCode()).toHaveLength(CODE_LENGTH);
  });

  it("n'emploie jamais un caractère qu'on peut confondre à l'oral", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(inviteCode()).not.toMatch(AMBIGUOUS);
    }
  });

  it("ne forme pas de mot : aucune voyelle dans l'alphabet, Y compris", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(inviteCode()).not.toMatch(/[AEIOUY]/);
    }
  });

  it("ne retire jamais deux fois le même code", () => {
    const seen = new Set<string>();

    for (let i = 0; i < 500; i += 1) {
      seen.add(inviteCode());
    }

    expect(seen.size).toBe(500);
  });

  it("couvre tout l'alphabet sur un grand nombre de tirages", () => {
    const letters = new Set([...Array.from({ length: 400 }, inviteCode).join("")]);

    expect(letters.size).toBe(27);
  });
});

describe("normalizeCode", () => {
  it("relève la casse et jette la mise en forme", () => {
    expect(normalizeCode("bcdf-ghjk-mnpq")).toBe("BCDFGHJKMNPQ");
    expect(normalizeCode(" bcdf ghjk mnpq ")).toBe("BCDFGHJKMNPQ");
  });

  it("ne devine pas un caractère ambigu", () => {
    // Un « 0 » saisi pour un « O » reste un « 0 » : le code sera refusé, ce qui
    // vaut mieux que de le faire correspondre à une autre invitation.
    expect(normalizeCode("0CDFGHJKMNPQ")).toBe("0CDFGHJKMNPQ");
  });
});

describe("formatCode", () => {
  it("groupe par quatre", () => {
    expect(formatCode("BCDFGHJKMNPQ")).toBe("BCDF-GHJK-MNPQ");
  });

  it("laisse tel quel ce qui ne se groupe pas", () => {
    expect(formatCode("")).toBe("");
    expect(formatCode("BCD")).toBe("BCD");
  });
});

describe("invitationState", () => {
  it("accepte une invitation ouverte et fraîche", () => {
    expect(invitationState(offer(), "compagne@example.com", NOW)).toBe("ok");
  });

  it("ne connaît pas un code absent", () => {
    expect(invitationState(null, "compagne@example.com", NOW)).toBe("unknown");
  });

  it("refuse une invitation déjà consommée", () => {
    expect(invitationState(offer({ acceptedAt: NOW }), "compagne@example.com", NOW)).toBe("used");
  });

  it("refuse une invitation périmée, bord inclus", () => {
    expect(invitationState(offer({ expiresAt: NOW }), "compagne@example.com", NOW)).toBe("expired");
  });

  it("refuse une invitation nominative présentée par quelqu'un d'autre", () => {
    const row = offer({ email: "compagne@example.com" });

    expect(invitationState(row, "voisin@example.com", NOW)).toBe("wrongEmail");
  });

  it("compare les adresses hors casse : Google renvoie ce qu'il veut", () => {
    const row = offer({ email: "compagne@example.com" });

    expect(invitationState(row, "Compagne@Example.com", NOW)).toBe("ok");
  });

  it("laisse passer une invitation nominative quand personne n'est connecté", () => {
    // La page doit pouvoir proposer la connexion avant de savoir qui vient.
    const row = offer({ email: "compagne@example.com" });

    expect(invitationState(row, null, NOW)).toBe("ok");
  });

  it("classe la péremption avant la nominativité", () => {
    // Sans ordre, un tiers apprendrait que l'invitation ne lui était pas destinée
    // là où « expirée » suffit.
    const row = offer({ expiresAt: NOW, email: "compagne@example.com" });

    expect(invitationState(row, "voisin@example.com", NOW)).toBe("expired");
  });
});
