import express from 'express'

import { PrismaClient } from "../generated/prisma/client.ts";

const prisma = new PrismaClient();

let privateRoute = express.Router()

privateRoute.get('/lista', async (req, res) => {
    
    try{
        let filter = {} // Comecar o fitro de dados com objeto vazio

        if(req.user.role === 'coordenador'){
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

})

export default privateRoute