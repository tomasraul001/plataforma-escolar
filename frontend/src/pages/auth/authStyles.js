// Estilos partilhados entre Login e Sigin.
//
// Antes viviam duplicados em cada ficheiro e divergiram: o Sigin usava
// `placeholder:text-gray/40` e o Login `placeholder:text-white/40`. A primeira
// nao gerava CSS nenhum — `gray` sem numero nao e uma cor do Tailwind, e o
// placeholder ficava a cor do texto preenchido. Centralizar evita a repeticao.

export const cardClass =
  "w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-8 md:p-10";

export const subtitleClass = "text-slate-300 text-sm";

export const labelClass = "text-sm font-semibold text-slate-100";

export const inputClass =
  "w-full bg-white/10 text-white placeholder:text-slate-400 border border-white/20 focus:border-violet-400 focus:bg-white/15 outline-none rounded-lg px-4 py-3 transition-all";

export const submitClass =
  "w-full mt-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3.5 font-bold rounded-lg hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40 transition-all cursor-pointer active:scale-[0.98]";

export const footerTextClass = "text-slate-300";