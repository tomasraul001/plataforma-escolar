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

// Deletar usuario (exclusivo do coordenador)
export const deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: "Não é possível excluir a própria conta" })
        }

        let user = await prisma.user.findUnique({
            where: {
                id: req.params.id
            }
        })

        if(!user){
            return res.status(404).json({message: 'Usuário não encontrado'})
        }

        await prisma.user.delete({
            where: {
                id: req.params.id
            }
        })

        res.status(200).json({message: 'Usuário excluído com sucesso'})
    } catch (error) {
        console.log(error)
        res.status(400).json({ message: "Erro ao excluir usuário"})
    }
}
