import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

interface AppUser {
  name: string;
  email: string;
  passwordHash: string;
}

const getUsers = (): AppUser[] => {
  try {
    return JSON.parse(process.env.APP_USERS || "[]");
  } catch {
    return [];
  }
};

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const users = getUsers();
        const user = users.find(
          (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
        );

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.email, name: user.name, email: user.email };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 horas
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.name = user.name;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) session.user.name = token.name as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
