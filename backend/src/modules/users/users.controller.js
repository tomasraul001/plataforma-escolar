import prisma from "../../config/prisma.js";
import bcrypt from "bcrypt";


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

// Atualizar perfil proprio
export const updateProfile = async (req, res) => {
    const { name, email, currentPassword } = req.body;
    const userId = req.user.id;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        // Se vai trocar email, validar senha atual
        if (email && email.toLowerCase() !== user.email) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Senha atual obrigatória para alterar o email" });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Senha atual incorreta" });
            }

            // Verificar unicidade do email
            const emailExists = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });
            if (emailExists && emailExists.id !== userId) {
                return res.status(400).json({ message: "Este email já está em uso" });
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                name: name || user.name,
                email: email ? email.toLowerCase() : user.email,
            },
            select: { id: true, name: true, email: true, role: true }
        });

        res.status(200).json({ message: "Perfil atualizado com sucesso", user: updated });
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
};

// Trocar senha
export const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Senha atual incorreta" });
        }

        const salt = await bcrypt.genSalt(10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: await bcrypt.hash(newPassword, salt) }
        });

        res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
        console.error("Erro ao trocar senha:", error);
        res.status(500).json({ message: "Erro ao trocar senha" });
    }
};
