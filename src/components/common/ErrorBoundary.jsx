import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Target Track ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white font-sans">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-800/95 border border-slate-700 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-black text-white">એપ્લિકેશન લોડ કરવામાં સમસ્યા આવી</h2>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                બ્રાઉઝરની જૂની કેશ (Old Cache) અથવા અપડેટ્સના કારણે પેજ અટકી ગયું છે. નીચે આપેલ બટનથી રીલોડ કરી શકો છો.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-black/40 text-[11px] font-mono text-rose-300 text-left overflow-x-auto border border-rose-500/20">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition cursor-pointer shadow-md"
              >
                🔄 ફરીથી લોડ કરો (Reload Page)
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="w-full py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                🧹 કેશ ક્લિયર કરી નવેસરથી શરૂ કરો
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
