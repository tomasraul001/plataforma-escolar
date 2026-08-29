import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function Welcome(){

    let navigate = useNavigate()

    function logOut(){
        localStorage.removeItem('isAdmin')
        localStorage.removeItem('token')   
        navigate('/login')
    }

    useEffect(() => {
        function accessControl(){
            let accessKey = localStorage.role
            
            switch (accessKey){
                case 'formador':
                    navigate('/formador')
                    break;
                case 'user':
                    navigate('/formando')
                    break;
                case 'coordenador':
                    navigate('/coordenador')
                    break;
            }
        }

        accessControl()
    }, [navigate])

    return (


        <div className='flex flex-col max-w-sm mt-20 border border-gray-500 shadow-lg p-6 rounded-lg m-auto font-italic  '>

            <h1 className='font-bold text-center'>Seja bem vindo</h1>
            <p> Sua jornada começa aqui neste ambiente</p>
            <p className='flex justify-end'>
                <button onClick={logOut} className='shadow-lg border border-gray-500 font-bold p-1 cursor-pointer rounded-md mt-2 hover:bg-blue-500 hover:text-white'>Sair</button>
            </p>

        </div>

    )
}