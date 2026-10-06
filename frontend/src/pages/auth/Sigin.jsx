import { Link, Navigate, useNavigate } from "react-router-dom"
import { useRef, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useToast } from "../../contexts/ToastContext"
import { cardClass, subtitleClass, labelClass, inputClass, submitClass, footerTextClass } from "./authStyles"

function validateEmail(email) {
  if (!email) return "Email é obrigatório";
  if (!email.trim().toLowerCase().endsWith("@gmail.com")) return "Email deve ser um endereço @gmail.com";
  if (email.trim().split("@")[0].length < 3) return "Email deve ter pelo menos 3 caracteres antes do @";
  return null;
}

function validatePassword(password) {
  if (!password) return "Senha é obrigatória";
  if (password.length < 6) return "Senha deve ter pelo menos 6 caracteres";
  if (new Set(password).size === 1) return "Senha não pode ter todos os caracteres iguais";
  const digits = password.split("").map(Number);
  if (digits.every((d) => !isNaN(d))) {
    let ascending = true, descending = true;
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i - 1] + 1) ascending = false;
      if (digits[i] !== digits[i - 1] - 1) descending = false;
    }
    if (ascending || descending) return "Senha não pode conter dígitos sequenciais";
  }
  return null;
}

export default function Sigin(){
    let inputName = useRef()
    let inputEmail = useRef()
    let inputPassword = useRef()
    let inputKey = useRef()
    let inputPhone = useRef()

    let [loading, setLoading] = useState(false)
    const { register } = useAuth()
    const toast = useToast().toast

    async function handleSigin(event){
        event.preventDefault();

        const accessKey = inputKey.current.value

        if(!inputKey.current.value) return toast.error("Insira a chave de acesso!")
        if(!inputName.current.value || !inputEmail.current.value || !inputPassword.current.value) return toast.error("Preencha todos os campos")

        const emailErr = validateEmail(inputEmail.current.value);
        if (emailErr) return toast.error(emailErr);

        const passwordErr = validatePassword(inputPassword.current.value);
        if (passwordErr) return toast.error(passwordErr);

        try{
            setLoading(true)
            await register({
                name: inputName.current.value,
                email: inputEmail.current.value,
                password: inputPassword.current.value,
                accessKey: accessKey,
                phone: inputPhone.current.value || undefined
            })

            toast.success("Usuario criado com sucesso")
            Navigate("/login")
        }catch (error){
            console.log('Erro ao criar usuario', error)
            toast.error("Erro ao criar usuario")
        }finally{
            setLoading(false)
        }
    }

    return (
        <section className="flex min-h-screen justify-center items-center px-4 py-10">
            <div className={cardClass}>
                <div className="flex flex-col items-center mb-8">
                    <h3 className="font-bold text-3xl text-white mb-1">Criar Conta</h3>
                    <p className={subtitleClass}>Regista-te para aceder à plataforma</p>
                </div>

                <form className="flex flex-col gap-5" onSubmit={handleSigin}>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass} htmlFor="name">Nome completo</label>
                        <input id="name" className={inputClass} type="text" placeholder="Ex: Maria Silva" ref={inputName} autoComplete="name" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass} htmlFor="email">Email</label>
                        <input id="email" className={inputClass} type="email" placeholder="Ex: maria@gmail.com" ref={inputEmail} autoComplete="email" />
                        <span className="text-xs text-slate-400">Tem de ser um endereço @gmail.com</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass} htmlFor="phone">Número de celular <span className="font-normal text-slate-400">(opcional)</span></label>
                        <input id="phone" className={inputClass} type="tel" placeholder="Ex: 84 123 4567" ref={inputPhone} autoComplete="tel" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass} htmlFor="password">Senha</label>
                        <input id="password" className={inputClass} type="password" placeholder="Mínimo 6 caracteres" ref={inputPassword} autoComplete="new-password" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass} htmlFor="accessKey">Chave de acesso</label>
                        <input id="accessKey" className={inputClass} type="text" placeholder="Chave fornecida pela secretaria" ref={inputKey} />
                    </div>
                    <button disabled={loading}
                        className={`${submitClass} ${loading ? 'opacity-60 cursor-wait' : ''}`} type="submit">
                        {loading ? 'Processando...' : 'Criar Conta'}
                    </button>
                </form>

                <div className="flex justify-center items-center gap-2 mt-6">
                    <span className={footerTextClass}>Já tens conta?</span>
                    <Link to="/Login" className="text-violet-400 font-semibold hover:text-violet-200 hover:underline transition-colors">Faz Login</Link>
                </div>
            </div>
        </section>
    )
}
