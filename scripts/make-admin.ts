import "./env";
/** Promote an existing account to admin:  npm run make-admin -- you@example.com */
(async () => {
  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import("../src/db");
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email.includes("@")) { console.error("Usage: npm run make-admin -- you@example.com"); process.exit(1); }
  const [u] = await db.update(schema.users).set({ role: "ADMIN" }).where(eq(schema.users.email, email)).returning({ id: schema.users.id });
  if (!u) { console.error(`No account found for ${email}. Sign up in the app first, then run this again.`); process.exit(1); }
  console.log(`✓ ${email} is now an admin. Sign out and back in, then open Admin in the side menu.`);
  process.exit(0);
})();
