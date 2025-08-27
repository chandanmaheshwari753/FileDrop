// import { useState, useEffect } from "react";
// import { supabase } from "./supabase";
// import Auth from "./components/Auth";
// import FileManager from "./components/FileManager";
// import { Toaster } from "react-hot-toast";
// import Chatbot from "./chatbot";

// export default function App() {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // Check for existing session
//     const getSession = async () => {
//       const {
//         data: { session },
//       } = await supabase.auth.getSession();
//       setUser(session?.user ?? null);
//       setLoading(false);
//     };

//     getSession();

//     // Listen for auth changes
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange(async (event, session) => {
//       setUser(session?.user ?? null);
//       setLoading(false);
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   const handleAuthSuccess = (user) => {
//     setUser(user);
//   };

//   const handleLogout = () => {
//     setUser(null);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-16 h-16 mx-auto mb-6 relative">
//             <div className="absolute inset-0 rounded-full border-4 border-purple-100"></div>
//             <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
//           </div>
//           <h3 className="text-lg font-semibold text-slate-800 mb-2">
//             Loading FileDrop
//           </h3>
//           <p className="text-slate-600">Please wait...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <>
//       <Toaster
//         position="top-center"
//         reverseOrder={false}
//         toastOptions={{
//           style: {
//             background: "#1e293b",
//             color: "#fff",
//             borderRadius: "12px",
//             fontSize: "14px",
//             fontWeight: "500",
//           },
//           success: {
//             iconTheme: { primary: "#8b5cf6", secondary: "white" },
//             duration: 3000,
//           },
//           error: {
//             iconTheme: { primary: "#ef4444", secondary: "white" },
//             duration: 4000,
//           },
//         }}
//       />

//       {user ? (
//         <>
//           <FileManager user={user} onLogout={handleLogout} />
//           <Chatbot />
//         </>
//       ) : (
//         <Auth onAuthSuccess={setUser} />
//       )}
//     </>
//   );
// }

import { useState, useEffect } from "react";
import { supabase } from "./supabase"; // ✅ Supabase client uses .env values
import Auth from "./components/Auth";
import FileManager from "./components/FileManager";
import { Toaster } from "react-hot-toast";
import Chatbot from "./chatbot";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // --- Check for existing session ---
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // --- Listen for auth changes ---
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = (user) => {
    setUser(user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut(); // ✅ properly sign out
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-purple-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Loading FileDrop
          </h3>
          <p className="text-slate-600">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast notifications */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "500",
          },
          success: {
            iconTheme: { primary: "#8b5cf6", secondary: "white" },
            duration: 3000,
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "white" },
            duration: 4000,
          },
        }}
      />

      {/* App content */}
      {user ? (
        <>
          <FileManager user={user} onLogout={handleLogout} />
          <Chatbot />
        </>
      ) : (
        <Auth onAuthSuccess={handleAuthSuccess} />
      )}
    </>
  );
}
