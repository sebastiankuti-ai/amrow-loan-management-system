import React, { useState, useEffect } from "react";
import { AppProvider, useApp } from "./components/AppContext.js";
import { Sidebar } from "./components/Sidebar.js";
import { Header } from "./components/Header.js";
import { MDDashboard } from "./components/MDDashboard.js";
import { ManagerDashboard } from "./components/ManagerDashboard.js";
import { OfficerDashboard } from "./components/OfficerDashboard.js";
import { ITDashboard } from "./components/ITDashboard.js";
import { HRDashboard } from "./components/HRDashboard.js";
import { StaffManagement } from "./components/StaffManagement.js";
import { ClientManagement } from "./components/ClientManagement.js";
import { LoanManagement } from "./components/LoanManagement.js";
import { SettingsManagement } from "./components/SettingsManagement.js";
import { AuditLogs } from "./components/AuditLogs.js";
import { UnifiedProfileViewer } from "./components/UnifiedProfileViewer.js";
import { AmrowLogoLight, AmrowLogoDark } from "./components/AmrowLogo.js";
import { UserRole } from "./types.js";
import { Activity, ShieldAlert, KeyRound, ArrowRightCircle, X } from "lucide-react";

const MainAppContent: React.FC = () => {
  const { state, currentUser, setCurrentUser, logAction, loading, updateState, currentView, navigateTo } = useApp();
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setShowWelcome(true);
    }
  }, [currentUser]);

  // Login credentials states
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Self-service password recovery states with multi-stage OTP verification
  const [loginMode, setLoginMode] = useState<"login" | "forgot">("login");
  const [resetUsername, setResetUsername] = useState("");
  const [resetContact, setResetContact] = useState("");
  const [resetStep, setResetStep] = useState<"request" | "verify" | "reset">("request");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");

  // Simulated push notification banner for SMS & Email delivery
  const [simulatedNotification, setSimulatedNotification] = useState<{
    recipient: string;
    channel: "SMS" | "Email";
    body: string;
    code: string;
    staffName: string;
  } | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const staffMember = state.staff.find(s => s.username === usernameInput);
    if (!staffMember) {
      setErrorMsg("Invalid username. Please check your credentials.");
      return;
    }

    if (staffMember.status === "Suspended") {
      setErrorMsg("Access Denied: This staff account has been SUSPENDED by the Managing Director.");
      return;
    }

    if (staffMember.status === "Terminated") {
      setErrorMsg("Access Denied: This account has been TERMINATED due to contract cessation.");
      return;
    }

    if (staffMember.verificationStatus === "Pending HR Verification") {
      setErrorMsg("Access Denied: This account is pending HR Verification. Please contact HR Harriet Rose.");
      return;
    }

    if (staffMember.itApprovalStatus === "Pending IT Approval") {
      setErrorMsg("Access Denied: Credentials pending IT system activation. Contact IT Officer Kelvin Kiprop.");
      return;
    }

    // Verify Access PIN / Password
    const expectedPassword = staffMember.password || "123456";
    if (passwordInput !== expectedPassword) {
      setErrorMsg("Access Denied: Incorrect PIN / Password. Please try again.");
      return;
    }

    setCurrentUser(staffMember);
    logAction("System Authentication", `Logged in successfully via local terminal`, staffMember);
    setUsernameInput("");
    setPasswordInput("");
  };

  // Step 1: Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setResetSuccessMsg("");

    if (!resetUsername || !resetContact) {
      setErrorMsg("Please enter both your Username and Corporate Email / Registered Phone.");
      return;
    }

    const staffMember = state.staff.find(
      s => s.username.trim().toLowerCase() === resetUsername.trim().toLowerCase()
    );

    if (!staffMember) {
      setErrorMsg("Access Denied: Unregistered personnel. Only pre-registered staff members are authorized to access this system.");
      return;
    }

    const contactClean = resetContact.trim().toLowerCase();
    const emailClean = staffMember.email.trim().toLowerCase();
    const phoneClean = (staffMember.phoneNumber || "").trim().toLowerCase();

    if (contactClean !== emailClean && contactClean !== phoneClean) {
      setErrorMsg("Verification failed: The Corporate Email or Phone Number provided does not match our security records for this username.");
      return;
    }

    // Generate random 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);

    const channelUsed = contactClean.includes("@") ? "Email" : "SMS";
    const bodyText = `[AMROW LMS Gateway Security] OTP Code: ${code}. Hello ${staffMember.fullName}, enter this 6-digit verification code to securely reset your internal access PIN / password.`;

    // Push simulated notification
    setSimulatedNotification({
      recipient: resetContact,
      channel: channelUsed,
      body: bodyText,
      code: code,
      staffName: staffMember.fullName
    });

    // Save into DB State under smsNotifications for audit compliance
    const newSmsNotification = {
      id: `sms-${Date.now()}`,
      clientId: staffMember.id, // linked to staff ID
      clientName: staffMember.fullName,
      phoneNumber: staffMember.phoneNumber || resetContact,
      loanRef: "AUTH-RESET",
      message: bodyText,
      type: "Reminder" as const, // audit type mapping
      sentAt: new Date().toISOString()
    };

    const newState = {
      ...state,
      smsNotifications: [...(state.smsNotifications || []), newSmsNotification]
    };
    await updateState(newState);

    setResetSuccessMsg(`Security Code sent! Please retrieve the 6-digit OTP code sent via simulated ${channelUsed} below.`);
    setResetStep("verify");
  };

  // Step 2: Verify Code
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setResetSuccessMsg("");

    if (!enteredOtp) {
      setErrorMsg("Please enter the 6-digit verification code/OTP.");
      return;
    }

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setErrorMsg("Security Error: Invalid or expired verification code/OTP. Please retrieve the correct code from the notification panel.");
      return;
    }

    setResetSuccessMsg("Identity verified successfully! Please enter your new Access PIN/Password below.");
    setResetStep("reset");
  };

  // Step 3: Apply New Password
  const handleApplyNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setResetSuccessMsg("");

    if (!resetNewPassword || !resetConfirmPassword) {
      setErrorMsg("Both password fields are required.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg("The new passwords do not match.");
      return;
    }

    const staffMember = state.staff.find(
      s => s.username.trim().toLowerCase() === resetUsername.trim().toLowerCase()
    );

    if (!staffMember) {
      setErrorMsg("Error: Associated staff member record could not be found.");
      return;
    }

    const newState = {
      ...state,
      staff: state.staff.map(s => {
        if (s.id === staffMember.id) {
          return { ...s, password: resetNewPassword };
        }
        return s;
      })
    };

    await updateState(newState);
    await logAction(
      "Password Reset",
      `Staff member ${staffMember.fullName} (${staffMember.role}) successfully verified OTP and updated their account Access PIN.`,
      staffMember
    );

    setResetSuccessMsg("Success! Your Access PIN / Password has been securely updated. Redirecting to login...");

    // Clear recovery state
    setTimeout(() => {
      setLoginMode("login");
      setResetStep("request");
      setResetUsername("");
      setResetContact("");
      setGeneratedOtp("");
      setEnteredOtp("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setResetSuccessMsg("");
      setSimulatedNotification(null);
    }, 2500);
  };

  const handleQuickDemoLogin = (userId: string) => {
    setErrorMsg("");
    const staffMember = state.staff.find(s => s.id === userId);
    if (staffMember) {
      if (staffMember.status === "Suspended") {
        setErrorMsg("Access Denied: Account is Suspended.");
        return;
      }
      if (staffMember.status === "Terminated") {
        setErrorMsg("Access Denied: Account is Terminated.");
        return;
      }
      if (staffMember.verificationStatus === "Pending HR Verification") {
        setErrorMsg("Access Denied: Pending HR Verification.");
        return;
      }
      if (staffMember.itApprovalStatus === "Pending IT Approval") {
        setErrorMsg("Access Denied: Pending IT system activation approval.");
        return;
      }
      setCurrentUser(staffMember);
      logAction("System Authentication", `Logged in successfully via quick developer session switch`, staffMember);
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      logAction("System De-Authentication", `Logged out of local terminal session`);
      setCurrentUser(null);
      navigateTo("dashboard");
    }
  };

  const handleRoleSwitch = (role: UserRole) => {
    // Quick role switch for evaluation - find first active staff with that role
    const staffWithRole = state.staff.find(s => s.role === role && s.status === "Active");
    if (staffWithRole) {
      setCurrentUser(staffWithRole);
      logAction("Developer Role Overrides", `Switched active session to ${staffWithRole.fullName} (${role})`);
    } else {
      alert(`No active staff registered with role: ${role}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-4">
        <Activity className="h-10 w-10 text-blue-500 animate-spin" />
        <p className="text-sm font-mono tracking-widest text-slate-400">LOADING AMROW SYSTEM...</p>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 flex flex-col justify-between p-6">
        
        {/* Branding header */}
        <div className="flex justify-center items-center py-4">
          <div className="w-full max-w-lg px-4">
            <AmrowLogoLight className="h-16 md:h-20 mx-auto" />
          </div>
        </div>

        {/* Middle form card */}
        <div className="flex flex-col items-center justify-center flex-1 py-10">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            
            {/* Top header decoration */}
            <div className="bg-slate-900 p-6 text-center text-white relative">
              <div className="absolute top-2 right-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[9px] font-mono rounded font-bold">
                SECURE LMS LOGIN
              </div>
              <h2 className="text-lg font-bold">Internal LMS Portal</h2>
              <p className="text-xs text-slate-400 mt-1">Authorized corporate employees only. Operations limited to Kakamega.</p>
            </div>

            {/* Login / Reset form wrapper */}
            {loginMode === "login" ? (
              <form onSubmit={handleLogin} className="p-6 space-y-4">
                
                {errorMsg && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-xs text-rose-700 font-medium">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Staff Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-slate-400">@</span>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="e.g. md_amrow"
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Access PIN / Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode("forgot");
                        setErrorMsg("");
                        setResetSuccessMsg("");
                      }}
                      className="text-[10px] text-blue-600 hover:underline font-semibold focus:outline-hidden"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>Initialize Secure Connection</span>
                  <ArrowRightCircle className="h-4 w-4" />
                </button>

              </form>
            ) : (
              <div className="p-6 space-y-4">
                <div className="text-center pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Self-Service Security Recovery</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {resetStep === "request" && "Provide username and registered email/phone to request a code."}
                    {resetStep === "verify" && "Verify the 6-digit secure security code/OTP sent to your device."}
                    {resetStep === "reset" && "Enter a new Access PIN / Password to secure your staff account."}
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-between items-center px-4 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400">
                  <span className={`${resetStep === "request" ? "text-blue-600" : "text-slate-500"}`}>1. Request</span>
                  <span className="text-slate-300">➔</span>
                  <span className={`${resetStep === "verify" ? "text-blue-600" : "text-slate-500"}`}>2. Verify OTP</span>
                  <span className="text-slate-300">➔</span>
                  <span className={`${resetStep === "reset" ? "text-blue-600" : "text-slate-500"}`}>3. New PIN</span>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-xs text-rose-700 font-medium">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {resetSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium text-center">
                    {resetSuccessMsg}
                  </div>
                )}

                {/* STEP 1: REQUEST CODE */}
                {resetStep === "request" && (
                  <form onSubmit={handleRequestCode} className="space-y-4">
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 text-[11px] text-slate-600 leading-relaxed">
                      <strong>💡 Requirements:</strong> To recover your Access PIN, you must be a pre-registered employee. Please provide your corporate Username along with your registered Email (e.g. <em>sebastiankuti@gmail.com</em>) or registered Phone Number.
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Staff Username</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-400">@</span>
                        <input
                          type="text"
                          value={resetUsername}
                          onChange={(e) => setResetUsername(e.target.value)}
                          placeholder="e.g. md_amrow"
                          className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Corporate Email OR Registered Phone</label>
                      <input
                        type="text"
                        value={resetContact}
                        onChange={(e) => setResetContact(e.target.value)}
                        placeholder="e.g. sebastiankuti@gmail.com or +254711001100"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode("login");
                          setErrorMsg("");
                          setResetSuccessMsg("");
                        }}
                        className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all"
                      >
                        Generate Security Code
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: VERIFY OTP CODE */}
                {resetStep === "verify" && (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Enter 6-Digit Verification Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g. 584930"
                        className="w-full text-center tracking-widest text-lg font-bold font-mono py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResetStep("request");
                          setErrorMsg("");
                          setResetSuccessMsg("");
                          setSimulatedNotification(null);
                        }}
                        className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all"
                      >
                        Verify Identity OTP
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: RESET PASSWORD */}
                {resetStep === "reset" && (
                  <form onSubmit={handleApplyNewPassword} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">New Access PIN / Password</label>
                      <input
                        type="password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Minimum 4 characters"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirm New Access PIN</label>
                      <input
                        type="password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        placeholder="Re-enter new PIN"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        disabled
                        className="w-1/3 bg-slate-100 text-slate-400 font-bold py-2.5 rounded-xl text-xs opacity-50 cursor-not-allowed"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/10 transition-all"
                      >
                        Save & Apply PIN
                      </button>
                    </div>
                  </form>
                )}

                {/* Simulated Delivery Push Notification Panel */}
                {simulatedNotification && (
                  <div className="mt-4 bg-slate-900 text-white border border-slate-800 rounded-xl p-4 space-y-2.5 relative overflow-hidden shadow-lg">
                    <div className="absolute right-0 top-0 bg-blue-500 text-white text-[8px] font-extrabold font-mono uppercase px-2 py-0.5 rounded-bl">
                      {simulatedNotification.channel} Gateway
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                      <p className="text-[10px] font-bold text-slate-300">📱 SIMULATED NOTIFICATION (DELIVERED)</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="text-slate-400 font-semibold">To: <span className="text-blue-300">{simulatedNotification.recipient}</span> ({simulatedNotification.staffName})</p>
                      <p className="bg-slate-950 p-2.5 rounded border border-slate-850 text-slate-300 text-[11px] leading-relaxed font-mono select-all">
                        {simulatedNotification.body}
                      </p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-1">
                      <span className="text-slate-400">Carrier: Safaricom / AMROW Mailer</span>
                      <button
                        onClick={() => {
                          setEnteredOtp(simulatedNotification.code);
                          alert("OTP code copied into the input box instantly!");
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded transition-all text-[10px]"
                      >
                        Copy OTP Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Demo Selector */}
            <div className="border-t border-slate-100 p-5 bg-slate-50/50 space-y-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Fast-Track Evaluation logins</p>
              <div className="grid grid-cols-2 gap-2">
                {state.staff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleQuickDemoLogin(s.id)}
                    className="text-[10px] bg-white hover:bg-blue-50 border border-slate-200 p-2 rounded-lg text-left shadow-xs transition-all flex flex-col justify-between"
                  >
                    <span className="font-bold text-slate-800 truncate">{s.fullName.split(" ")[0]} ({s.username})</span>
                    <span className="text-slate-400 text-[9px] font-mono mt-0.5">{s.role.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 font-mono">
          AMROW CAPITAL LTD • Licensed Microfinance Institution • Kakamega, Kenya
        </div>
      </div>
    );
  }

  // MAIN RUNTIME LAYOUT
  const renderTabContent = () => {
    // Check if we are viewing a specific profile entity
    if (currentView.entityId && (currentView.entityType === "Client" || currentView.entityType === "Staff")) {
      return <UnifiedProfileViewer />;
    }

    switch (currentView.tab) {
      case "dashboard":
        if (currentUser.role === UserRole.MD) return <MDDashboard />;
        if (currentUser.role === UserRole.BRANCH_MANAGER) return <ManagerDashboard />;
        if (currentUser.role === UserRole.LOAN_OFFICER) return <OfficerDashboard />;
        if (currentUser.role === UserRole.IT) return <ITDashboard />;
        if (currentUser.role === UserRole.HR) return <HRDashboard />;
        // Other roles defaults to basic summary dashboards or standard logs
        return <ManagerDashboard />;
      case "clients":
        return <ClientManagement />;
      case "loans":
        return <LoanManagement />;
      case "staff":
        return <StaffManagement />;
      case "settings":
        return <SettingsManagement />;
      case "audit-logs":
        return <AuditLogs />;
      default:
        return <MDDashboard />;
    }
  };

  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    let timeGreeting = "Good Morning";
    if (hour >= 12 && hour < 17) {
      timeGreeting = "Good Afternoon";
    } else if (hour >= 17) {
      timeGreeting = "Good Evening";
    }

    const isMD = currentUser?.role === UserRole.MD;
    
    if (isMD) {
      return {
        title: `${timeGreeting} Mr. Sebastian (MD), welcome to AMROW CAPITAL LTD.`,
        body: "Remember: MD is able to do anything on the system without restriction because you are the owner. You hold full, unrestricted administrative permissions across all financial configurations, regional operations, and system bounds.",
        badge: "System Owner"
      };
    } else {
      const shortName = currentUser?.fullName.split(" ")[0] || "User";
      const isMr = ["Charles", "David", "John", "Kelvin"].includes(shortName);
      const salutation = isMr ? "Mr." : "Ms.";
      return {
        title: `${timeGreeting} ${salutation} ${shortName} (${currentUser?.role}), welcome to AMROW CAPITAL LTD.`,
        body: "Your authorized local session has been successfully established with dual-control compliance standards.",
        badge: currentUser?.role || "Staff"
      };
    }
  };

  return (
    <div id="main-app-shell" className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <Sidebar activeTab={currentView.tab} setActiveTab={(tab) => navigateTo(tab)} onLogout={handleLogout} />

      {/* Right Column Content container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <Header onRoleSwitch={handleRoleSwitch} />

        {/* Screen Stage */}
        <main id="app-main-view" className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* Automatic Welcome Greeting */}
          {showWelcome && currentUser && (
            <div 
              id="automatic-welcome-banner" 
              className="mb-6 bg-slate-900 border border-slate-800 text-white p-6 md:p-8 rounded-2xl shadow-xl relative overflow-hidden transition-all duration-300 flex flex-col items-center justify-center text-center"
            >
              {/* Decorative dynamic neon element */}
              <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="absolute -right-16 -top-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
              
              {/* Center Dismiss button */}
              <button
                onClick={() => setShowWelcome(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                title="Dismiss welcome message"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="w-full max-w-lg z-10 space-y-4 flex flex-col items-center">
                {/* Centered AMROW logo in banner */}
                <AmrowLogoDark className="h-16 md:h-20" />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2.5">
                    <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {getGreetingMessage().badge}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span>
                    <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Kakamega Headquarters</span>
                  </div>
                  
                  <h3 className="text-base font-extrabold tracking-tight text-white md:text-lg">
                    {getGreetingMessage().title}
                  </h3>
                  
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xl font-medium mx-auto">
                    {getGreetingMessage().body}
                  </p>
                </div>
              </div>
            </div>
          )}

          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
