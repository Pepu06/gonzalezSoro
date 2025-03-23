import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MongoAdapter as Database } from '@builderbot/database-mongo'
import { MetaProvider as Provider } from '@builderbot/provider-meta'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { Department, Message } from './models/schemas'

dotenv.config()

const PORT = process.env.PORT ?? 3008
let potentialMatches = [];
let mensajePrincipal = '';

// Initialize MongoDB connection
mongoose.connect(process.env.MONGO_DB_URI)
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => {
        console.error('MongoDB connection error:', err)
        process.exit(1)
    })

const textFlow = addKeyword<Provider, Database>(['en ', ' departamento '])
    .addAction(async (ctx, ctxFn) => {
        try {
            const userMessage = ctx.body;
            mensajePrincipal = userMessage; // Store the original message

            // First, get all existing departments
            const allDepartments = await Department.find({});

            // Extract words from user message (excluding common words)
            const messageWords = userMessage.toLowerCase().split(/\s+/)
                .filter(word => word.length > 2); // Filter out short words

            // Find potential department matches
            potentialMatches = allDepartments.filter(dept => {
                const deptAddress = dept.address.toLowerCase();
                return messageWords.some(word => deptAddress.includes(word));
            });

            if (potentialMatches.length > 0) {
                // Create numbered list of departments
                const departmentList = potentialMatches
                    .map((dept, index) => `${index + 1}. ${dept.address}`)
                    .join('\n');

                // Create buttons with numbers
                const buttons = [
                    ...potentialMatches.map((_, index) => ({
                        body: `Seleccionar: ${index + 1}`
                    })),
                    { body: 'Crear nuevo' }
                ];

                await ctxFn.flowDynamic([{
                    body: `He encontrado los siguientes departamentos que podrían coincidir. Por favor, seleccione uno o cree uno nuevo:\n${departmentList}`,
                    buttons
                }]);
            } else {
                // No matches found, send response with only new department option
                await ctxFn.flowDynamic([{
                    body: 'No encontré departamentos que coincidan con su mensaje. ¿Desea crear uno nuevo?',
                    buttons: [{ body: 'Crear nuevo' }]
                }]);
            }

        } catch (error) {
            console.error('Error in text flow:', error);
            await ctxFn.flowDynamic('Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.');
        }
    });

// Flow for handling department selection or creation
const departmentSelectionFlow = addKeyword<Provider, Database>(['Seleccionar', 'Crear'])
    .addAction(async (ctx, ctxFn) => {
        try {
            const selection = ctx.body;
            const userMessage = ctx.body; // Use ctx.body as the message content
            const message = ctx.body.toLowerCase();

            if (message.includes('crear')) {
                // Store the original message in the context for later use
                ctx.originalMessage = userMessage;
                await ctxFn.flowDynamic('Por favor, proporcione la dirección exacta del nuevo departamento. Empeza con `Nuevo departamento: `');
            } else {
                // Extract number from selection and get corresponding department
                const selectedNumber = parseInt(selection.replace('Seleccionar: ', '')) - 1;
                console.log('Selected number:', selectedNumber);
                const department = potentialMatches[selectedNumber];
                console

                if (department) {
                    // Create new message directly in the selected department
                    const message = await Message.create({
                        text: mensajePrincipal, // Use the stored original message
                        department: department._id
                    });

                    // Update department with the new message
                    await Department.findByIdAndUpdate(
                        department._id,
                        { $push: { messages: message._id } }
                    );

                    const deptAddress = department.address.toLowerCase(); // san benito de palermo 1584
                    const messageWords = message.text.toLowerCase().split(/\s+/) // en san benito hay luz
                    const deptoEnMje = messageWords.reduce((longest, word) => {
                        if (deptAddress.includes(word) && word.length > longest.length) {
                            return word;
                        }
                        return longest;
                    }, ''); // san benito

                    console.log('deptoEnMje:', deptoEnMje); // san benito

                    const messageText = message.text.replace(`en ${deptoEnMje}`, '').trim() // hay luz
                    // Send a detailed confirmation message
                    await ctxFn.flowDynamic([
                        {
                            body: 'Información guardada exitosamente:\n\n' +
                                `📍 Departamento: ${department.address}\n` + // san benito de palermo 1584
                                `💬 Mensaje: ${messageText}` // hay luz
                        }
                    ]);
                }
            }
        } catch (error) {
            console.error('Error in department selection flow:', error);
            await ctxFn.flowDynamic('Lo siento, hubo un error al procesar su selección. Por favor, inténtalo de nuevo.');
        }
    });

// Flow for handling new department creation
const newDepartmentFlow = addKeyword<Provider, Database>(['Nuevo', 'departamento: '])
    .addAction(async (ctx, ctxFn) => {
        console.log('newDepartmentFlow triggered');
        try {
            // Extract the address by removing the prefix
            const newAddress = ctx.body.replace('Nuevo departamento: ', '').trim();
            // Use the stored original message for consistency

            // Create new department
            const department = await Department.findOneAndUpdate(
                { address: newAddress },
                { address: newAddress },
                { upsert: true, new: true }
            );

            // Create new message with the original message text
            const message = await Message.create({
                text: mensajePrincipal, // This ensures text field is always populated
                department: department._id
            });

            // Update department with the new message
            await Department.findByIdAndUpdate(
                department._id,
                { $push: { messages: message._id } }
            );

            const deptAddress = department.address.toLowerCase(); // san benito de palermo 1584
            const messageWords = message.text.toLowerCase().split(/\s+/) // en san benito hay luz
            const deptoEnMje = messageWords.reduce((longest, word) => {
                if (deptAddress.includes(word) && word.length > longest.length) {
                    return word;
                }
                return longest;
            }, ''); // san benito

            console.log('deptoEnMje:', deptoEnMje); // san benito

            const messageText = message.text.replace(`en ${deptoEnMje}`, '').trim() // hay luz
            // Send a detailed confirmation message
            await ctxFn.flowDynamic([
                {
                    body: 'Información guardada exitosamente:\n\n' +
                        `📍 Departamento: ${department.address}\n` + // san benito de palermo 1584
                        `💬 Mensaje: ${messageText}` // hay luz
                }
            ]);
        } catch (error) {
            console.error('Error in new department flow:', error);
            await ctxFn.flowDynamic('Lo siento, hubo un error al crear el nuevo departamento. Por favor, inténtalo de nuevo.');
        }
    });

const main = async () => {
    const adapterFlow = createFlow([textFlow, departmentSelectionFlow, newDepartmentFlow])
    const adapterProvider = createProvider(Provider, {
        jwtToken: process.env.jwtToken,
        numberId: process.env.numberId,
        verifyToken: process.env.verifyToken,
        version: process.env.version
    })
    const adapterDB = new Database({
        dbUri: process.env.MONGO_DB_URI,
        dbName: process.env.MONGO_DB_NAME,
    })

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
