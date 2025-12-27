import suscriptionPlan from "../models/suscriptionPlan.model.js";
import User from "../models/user.model.js";
import Sucursal from "../models/sucursal.model.js";

const isTeamsPlan = (plan) => plan.name === "Teams";

const hasActiveSubscription = (start, end) => {
    if (!end) return false;
    return end > new Date();
};

// obtener planes de suscripcion
export const getPlans = async (req, res) => {
    try {
        const plans = await suscriptionPlan.find();
        res.status(200).json(plans);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los planes de suscripción", error });
    }
};

// Crear un plan de suscripción (uso interno / admin)
export const createPlan = async (req, res) => {
    try {
        const {
            name,
            price,
            durationInMonths,
            features,
            isActive,
            basePrice,
            pricePerAdmin,
            pricePerProfessional,
            pricePerAssistant,
        } = req.body;

        const plan = await suscriptionPlan.create({
            name,
            price,
            durationInMonths,
            features,
            isActive,
            basePrice,
            pricePerAdmin,
            pricePerProfessional,
            pricePerAssistant,
        });

        res.status(201).json(plan);
    } catch (error) {
        res.status(500).json({ message: "Error al crear el plan", error });
    }
};

// Actualizar un plan de suscripción (uso interno / admin)
export const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            price,
            durationInMonths,
            features,
            isActive,
            basePrice,
            pricePerAdmin,
            pricePerProfessional,
            pricePerAssistant,
        } = req.body;

        const update = {};
        if (price !== undefined) update.price = price;
        if (durationInMonths !== undefined) update.durationInMonths = durationInMonths;
        if (features !== undefined) update.features = features;
        if (isActive !== undefined) update.isActive = isActive;
        if (basePrice !== undefined) update.basePrice = basePrice;
        if (pricePerAdmin !== undefined) update.pricePerAdmin = pricePerAdmin;
        if (pricePerProfessional !== undefined) update.pricePerProfessional = pricePerProfessional;
        if (pricePerAssistant !== undefined) update.pricePerAssistant = pricePerAssistant;

        const plan = await suscriptionPlan.findByIdAndUpdate(id, update, { new: true });
        if (!plan) {
            return res.status(404).json({ message: "Plan no encontrado" });
        }

        return res.json(plan);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el plan", error });
    }
};

// Calcular precio del plan Teams
// Regla: el basePrice incluye a 1 administrador. Solo se cobra desde el segundo admin en adelante.
const calculateTeamsPrice = (plan, cantidadAdmins = 0, cantidadProfessionals = 0, cantidadAssistants = 0) => {
    const extraAdmins = Math.max(0, (cantidadAdmins || 0) - 1);
    const professionalsCount = cantidadProfessionals || 0;
    const assistantsCount = cantidadAssistants || 0;

    return (
        plan.basePrice +
        extraAdmins * plan.pricePerAdmin +
        professionalsCount * plan.pricePerProfessional +
        assistantsCount * plan.pricePerAssistant
    );
};

// Calcular precio para cualquier plan
export const calculatePrice = async (req, res) => {
    try {
        const { planId, cantidadAdmins, cantidadProfessionals, cantidadAssistants } = req.body;

        const plan = await suscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: "Plan no encontrado" });
        }

        let finalPrice = plan.price;
        let breakdown = { basePrice: plan.price };

        if (plan.name === "Teams") {
            const adminsCount = cantidadAdmins || 0;
            const professionalsCount = cantidadProfessionals || 0;
            const assistantsCount = cantidadAssistants || 0;

            const extraAdmins = Math.max(0, adminsCount - 1);

            breakdown = {
                basePrice: plan.basePrice,
                admins: {
                    quantity: adminsCount,
                    unitPrice: plan.pricePerAdmin,
                    // Solo se cobra desde el segundo admin en adelante
                    subtotal: extraAdmins * plan.pricePerAdmin
                },
                professionals: {
                    quantity: professionalsCount,
                    unitPrice: plan.pricePerProfessional,
                    subtotal: professionalsCount * plan.pricePerProfessional
                },
                assistants: {
                    quantity: assistantsCount,
                    unitPrice: plan.pricePerAssistant,
                    subtotal: assistantsCount * plan.pricePerAssistant
                }
            };

            finalPrice = calculateTeamsPrice(plan, adminsCount, professionalsCount, assistantsCount);
        }

        res.json({
            planName: plan.name,
            finalPrice,
            breakdown,
            durationInMonths: plan.durationInMonths
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Suscribir a un plan
export const subscribe = async (req, res) => {
    try {
        // Bloqueo: no permitir activar suscripciones sin pago.
        // El flujo correcto es iniciar Webpay en /api/transbank/create-subscription
        // y activar la suscripción al confirmar el pago.
        return res.status(400).json({
            message: "Pago requerido. Para contratar un plan debes iniciar Webpay.",
            requiresPayment: true,
            nextAction: {
                endpoint: "/api/transbank/create-subscription",
                method: "POST",
                body: {
                    planId: "<planId>",
                    billingCycle: "monthly|yearly",
                    cantidadAdmins: "(solo Teams)",
                    cantidadProfessionals: "(solo Teams)",
                    cantidadAssistants: "(solo Teams)",
                },
            },
        });

        // const { planId, cantidadAdmins, cantidadProfessionals, cantidadAssistants, paymentMethodId } = req.body;
        // const userId = req.user.id;

        const plan = await suscriptionPlan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({ message: "Plan no encontrado o inactivo" });
        }

        const user = await User.findById(userId).populate("suscriptionPlan sucursal");

        // Si es plan individual (Basic / Standard) -> suscripción a nivel de usuario
        if (!isTeamsPlan(plan)) {
            if (hasActiveSubscription(user.suscriptionStartDate, user.suscriptionEndDate)) {
                return res.status(400).json({
                    message: "Ya tienes una suscripción individual activa.",
                    currentSubscription: {
                        plan: user.suscriptionPlan,
                        endDate: user.suscriptionEndDate,
                    },
                });
            }

            // TODO: procesar pago con finalPrice = plan.price

            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + plan.durationInMonths);

            user.suscriptionPlan = planId;
            user.suscriptionStartDate = startDate;
            user.suscriptionEndDate = endDate;
            await user.save();

            return res.json({
                message: "Suscripción individual exitosa",
                scope: "USER",
                subscription: {
                    plan: plan.name,
                    price: plan.price,
                    startDate,
                    endDate,
                },
            });
        }

        // === Plan Teams ===
        if (!user.sucursal) {
            return res.status(400).json({
                message: "Para suscribirte al plan Teams debes tener una sucursal asociada.",
            });
        }

        const sucursal = await Sucursal.findById(user.sucursal).populate("suscriptionPlan");
        if (!sucursal) {
            return res.status(404).json({ message: "Sucursal no encontrada" });
        }

        if (hasActiveSubscription(sucursal.suscriptionStartDate, sucursal.suscriptionEndDate)) {
            return res.status(400).json({
                message: "Esta sucursal ya tiene una suscripción Teams activa.",
                currentSubscription: {
                    plan: sucursal.suscriptionPlan,
                    endDate: sucursal.suscriptionEndDate,
                },
            });
        }

        if (!cantidadAdmins && !cantidadProfessionals && !cantidadAssistants) {
            return res.status(400).json({
                message: "Debes especificar la cantidad de admins, profesionales o asistentes para el plan Teams.",
            });
        }

        const admins = cantidadAdmins || 0;
        const pros = cantidadProfessionals || 0;
        const asists = cantidadAssistants || 0;
        const finalPrice = calculateTeamsPrice(plan, admins, pros, asists);

        const teamConfig = {
            cantidadAdmins: admins,
            cantidadProfessionals: pros,
            cantidadAssistants: asists,
            maxUsers: admins + pros + asists,
        };

        // TODO: procesar pago con finalPrice

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + plan.durationInMonths);

        sucursal.suscriptionPlan = planId;
        sucursal.suscriptionStartDate = startDate;
        sucursal.suscriptionEndDate = endDate;
        sucursal.teamConfig = teamConfig;
        await sucursal.save();

        return res.json({
            message: "Suscripción Teams exitosa",
            scope: "SUCURSAL",
            subscription: {
                plan: plan.name,
                price: finalPrice,
                startDate,
                endDate,
                teamConfig,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Upgrade o downgrade de plan
export const changePlan = async (req, res) => {
    try {
        // Bloqueo: no permitir cambios de plan sin pago.
        // Usa el flujo Webpay /api/transbank/create-subscription y activa al confirmar.
        return res.status(400).json({
            message: "Pago requerido. Para cambiar de plan debes iniciar Webpay.",
            requiresPayment: true,
            nextAction: {
                endpoint: "/api/transbank/create-subscription",
                method: "POST",
                body: {
                    planId: "<newPlanId>",
                    billingCycle: "monthly|yearly",
                },
            },
        });

        const { newPlanId } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId).populate("suscriptionPlan sucursal");

        // Detectar suscripción ACTIVA y su scope (USER o SUCURSAL) igual que en renewSubscription
        let currentScope = null;
        let currentPlan = null;

        if (
            user.suscriptionPlan &&
            hasActiveSubscription(user.suscriptionStartDate, user.suscriptionEndDate)
        ) {
            currentScope = "USER";
            currentPlan = user.suscriptionPlan;
        } else if (user.sucursal) {
            const sucursal = await Sucursal.findById(user.sucursal).populate("suscriptionPlan");
            if (
                sucursal &&
                sucursal.suscriptionPlan &&
                hasActiveSubscription(sucursal.suscriptionStartDate, sucursal.suscriptionEndDate)
            ) {
                currentScope = "SUCURSAL";
                currentPlan = sucursal.suscriptionPlan;
            }
        }

        if (!currentScope || !currentPlan) {
            return res.status(400).json({ message: "No tienes una suscripción activa" });
        }

        const newPlan = await suscriptionPlan.findById(newPlanId);
        if (!newPlan || !newPlan.isActive) {
            return res.status(404).json({ message: "Nuevo plan no encontrado o inactivo" });
        }

        // Este endpoint SOLO maneja cambios entre planes individuales.
        // Si el plan actual o el nuevo son Teams, rechazamos aquí.
        if (isTeamsPlan(currentPlan) || isTeamsPlan(newPlan)) {
            return res.status(400).json({
                message:
                    "changePlan solo soporta cambios entre planes individuales (Basic/Standard). " +
                    "Para pasar a Teams o desde Teams usa un flujo específico.",
            });
        }

        // En este punto: scope = USER y ambos planes son individuales.
        // (si el scope fuera SUCURSAL, el plan tendría que ser Teams, ya rechazado arriba)
        // Puedes dejar TODO el cálculo de prorrateo como algo opcional/TODO.
        const daysRemaining = Math.ceil(
            (user.suscriptionEndDate - new Date()) / (1000 * 60 * 60 * 24)
        );
        const totalDays = currentPlan.durationInMonths * 30;
        const newPrice = newPlan.price;
        const prorratedCharge = (newPrice * daysRemaining) / totalDays;

        // TODO: procesar cargo prorrateado (prorratedCharge)

        user.suscriptionPlan = newPlanId;
        await user.save();

        return res.json({
            message: "Plan individual actualizado exitosamente",
            scope: "USER",
            previousPlan: currentPlan.name,
            newPlan: newPlan.name,
            prorratedCharge,
            endDate: user.suscriptionEndDate,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cancelar suscripción
export const unsubscribe = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate("suscriptionPlan sucursal");

        let scope = null;
        let accessUntil = null;
        let sucursal = null;

        if (user.suscriptionPlan && hasActiveSubscription(user.suscriptionStartDate, user.suscriptionEndDate)) {
            scope = "USER";
            accessUntil = user.suscriptionEndDate;

            user.suscriptionPlan = null;
            user.suscriptionStartDate = null;
            user.suscriptionEndDate = null;
            user.externalCustomerId = null;
            await user.save();
        } else if (user.sucursal) {
            sucursal = await Sucursal.findById(user.sucursal).populate("suscriptionPlan");
            if (
                sucursal &&
                sucursal.suscriptionPlan &&
                hasActiveSubscription(sucursal.suscriptionStartDate, sucursal.suscriptionEndDate)
            ) {
                scope = "SUCURSAL";
                accessUntil = sucursal.suscriptionEndDate;

                sucursal.suscriptionPlan = null;
                sucursal.suscriptionStartDate = null;
                sucursal.suscriptionEndDate = null;
                sucursal.teamConfig = {
                    cantidadAdmins: 1,
                    cantidadProfessionals: 0,
                    cantidadAssistants: 0,
                    maxUsers: 1,
                };
                await sucursal.save();
            }
        }

        if (!scope) {
            return res.status(400).json({ message: "No tienes una suscripción activa" });
        }

        res.json({
            message: "Suscripción cancelada.",
            scope,
            accessUntil,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener estado de suscripción del usuario
export const getSubscriptions = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate("suscriptionPlan sucursal");

        const now = new Date();

        // 1) Suscripción individual (User)
        if (user.suscriptionPlan && hasActiveSubscription(user.suscriptionStartDate, user.suscriptionEndDate)) {
            const daysRemaining = Math.ceil((user.suscriptionEndDate - now) / (1000 * 60 * 60 * 24));

            return res.json({
                hasSubscription: true,
                scope: "USER",
                isActive: true,
                subscription: {
                    plan: user.suscriptionPlan,
                    startDate: user.suscriptionStartDate,
                    endDate: user.suscriptionEndDate,
                    daysRemaining: Math.max(0, daysRemaining),
                    teamConfig: null,
                },
            });
        }

        // 2) Suscripción Teams (Sucursal)
        if (user.sucursal) {
            const sucursal = await Sucursal.findById(user.sucursal).populate("suscriptionPlan");
            if (
                sucursal &&
                sucursal.suscriptionPlan &&
                hasActiveSubscription(sucursal.suscriptionStartDate, sucursal.suscriptionEndDate)
            ) {
                const daysRemaining = Math.ceil(
                    (sucursal.suscriptionEndDate - now) / (1000 * 60 * 60 * 24)
                );

                return res.json({
                    hasSubscription: true,
                    scope: "SUCURSAL",
                    isActive: true,
                    subscription: {
                        plan: sucursal.suscriptionPlan,
                        startDate: sucursal.suscriptionStartDate,
                        endDate: sucursal.suscriptionEndDate,
                        daysRemaining: Math.max(0, daysRemaining),
                        teamConfig: sucursal.teamConfig,
                    },
                });
            }
        }

        // 3) Sin suscripción
        return res.json({
            hasSubscription: false,
            message: "No tienes una suscripción activa",
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Verificar estado de suscripción (middleware helper)
export const checkSubscriptionStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate("suscriptionPlan sucursal");

        // User individual
        if (user.suscriptionPlan && hasActiveSubscription(user.suscriptionStartDate, user.suscriptionEndDate)) {
            return res.json({
                isValid: true,
                scope: "USER",
                plan: user.suscriptionPlan.name,
                endDate: user.suscriptionEndDate,
            });
        }

        // Sucursal Teams
        if (user.sucursal) {
            const sucursal = await Sucursal.findById(user.sucursal).populate("suscriptionPlan");
            if (
                sucursal &&
                sucursal.suscriptionPlan &&
                hasActiveSubscription(sucursal.suscriptionStartDate, sucursal.suscriptionEndDate)
            ) {
                return res.json({
                    isValid: true,
                    scope: "SUCURSAL",
                    plan: sucursal.suscriptionPlan.name,
                    endDate: sucursal.suscriptionEndDate,
                });
            }
        }

        return res.status(403).json({
            message: "Tu suscripción ha expirado o no tienes una activa",
            requiresUpgrade: true,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Renovar suscripción
export const renewSubscription = async (req, res) => {
    try {
        // Bloqueo: no permitir renovar sin pago.
        // Usa el flujo Webpay /api/transbank/create-subscription y activa al confirmar.
        return res.status(400).json({
            message: "Pago requerido. Para renovar tu suscripción debes iniciar Webpay.",
            requiresPayment: true,
            nextAction: {
                endpoint: "/api/transbank/create-subscription",
                method: "POST",
                body: {
                    planId: "<planId>",
                    billingCycle: "monthly|yearly",
                },
            },
        });

        const { paymentMethodId } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId).populate("suscriptionPlan sucursal");

        let scope = null;
        let plan = null;
        let endDate = null;
        let sucursal = null;

        // Individual
        if (user.suscriptionPlan && hasActiveSubscription(user.suscriptionStartDate, user.suscriptionEndDate)) {
            scope = "USER";
            plan = user.suscriptionPlan;
            endDate = new Date(user.suscriptionEndDate);
        } else if (user.sucursal) {
            // Teams
            sucursal = await Sucursal.findById(user.sucursal).populate("suscriptionPlan");
            if (
                sucursal &&
                sucursal.suscriptionPlan &&
                hasActiveSubscription(sucursal.suscriptionStartDate, sucursal.suscriptionEndDate)
            ) {
                scope = "SUCURSAL";
                plan = sucursal.suscriptionPlan;
                endDate = new Date(sucursal.suscriptionEndDate);
            }
        }

        if (!scope || !plan) {
            return res.status(400).json({ message: "No tienes una suscripción para renovar" });
        }

        // Calcular precio
        let finalPrice = plan.price;
        if (isTeamsPlan(plan) && sucursal?.teamConfig) {
            finalPrice = calculateTeamsPrice(
                plan,
                sucursal.teamConfig.cantidadAdmins,
                sucursal.teamConfig.cantidadProfessionals,
                sucursal.teamConfig.cantidadAssistants
            );
        }

        // TODO: procesar pago con finalPrice y paymentMethodId

        endDate.setMonth(endDate.getMonth() + plan.durationInMonths);

        if (scope === "USER") {
            user.suscriptionEndDate = endDate;
            await user.save();
        } else {
            sucursal.suscriptionEndDate = endDate;
            await sucursal.save();
        }

        res.json({
            message: "Suscripción renovada exitosamente",
            scope,
            newEndDate: endDate,
            price: finalPrice,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener historial de suscripciones (opcional para futuro)
export const getSubscriptionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate("suscriptionPlan sucursal");

        let current = null;

        // Suscripción individual activa
        if (
            user.suscriptionPlan &&
            hasActiveSubscription(user.suscriptionStartDate, user.suscriptionEndDate)
        ) {
            current = {
                scope: "USER",
                plan: user.suscriptionPlan,
                startDate: user.suscriptionStartDate,
                endDate: user.suscriptionEndDate,
            };
        } else if (user.sucursal) {
            // Suscripción Teams de sucursal
            const sucursal = await Sucursal.findById(user.sucursal).populate("suscriptionPlan");
            if (
                sucursal &&
                sucursal.suscriptionPlan &&
                hasActiveSubscription(sucursal.suscriptionStartDate, sucursal.suscriptionEndDate)
            ) {
                current = {
                    scope: "SUCURSAL",
                    plan: sucursal.suscriptionPlan,
                    startDate: sucursal.suscriptionStartDate,
                    endDate: sucursal.suscriptionEndDate,
                    teamConfig: sucursal.teamConfig,
                };
            }
        }

        return res.json({
            currentSubscription: current,
            history: [], // cuando tengas un modelo de historial real, lo completas aquí
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};