import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center dark:bg-[#070b13] bg-[#f8fafc] p-6 relative overflow-hidden">
      {/* Background Graphic Blobs */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/5 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-600/5 pointer-events-none" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="z-10 w-full max-w-[400px] flex flex-col items-center">
        {/* Branding header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25">
            LM
          </div>
          <span className="text-xl font-bold dark:text-white text-gray-900 tracking-tight">LastMile Logistics</span>
        </div>

        {/* Clerk Sign Up component */}
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
      </div>
    </main>
  );
}
