import prisma from "../../config/prisma.js";


export const getAllUsers = async (req, res) => {
    console.log(`Buscando dados...`)
    try{
        let filter = {} // Comecar o fitro de dados com objeto vazio

        if(req.user.role === 'coordenador' || req.user.role === 'secretaria'){
            filter = {
                role: {
                    in: ['formador', 'formando']
                }
            }
        }else if(req.user.role === 'formador'){
            filter = {
                role: 'formando'
            }
        }else{
            res.status(404).json({message: 'Acesso negado'})
        }

        // Pegar dados no banco
        let user = await prisma.user.findMany({
            where: filter,
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        })

        res.status(200).json(user)

    } catch(error){
        console.log(error)
        res.status(400).json({ message: "Erro ao buscar users"})
    }

}

// Deletar usuario
export const deleteUser = async (req, res) => {
    try {
        let user = await prisma.user.findUnique({
        where: {
            id: req.params.id
        }
        })

        if(!user){
            return res.status(404).json({message: 'User not found'})
        }

        await prisma.user.delete({
            where: {
                id: req.params.id
            }
        })

        res.status(200).json({message: 'User deleted successfully'})
    } catch (error) {
        console.log(error)
        res.status(400).json({ message: "Erro ao deletar user"})
    }
}
