import { Router } from "express";
import { 
    subscribe, 
    unsubscribe, 
    getSubscriptions,
    getPlans,
    calculatePrice,
    changePlan,
    renewSubscription,
    checkSubscriptionStatus,
    getSubscriptionHistory,
    updatePlan,
    createPlan,
} from "../controllers/subscription.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/plans", getPlans);
router.post("/plans", auth, createPlan);
router.put("/plans/:id", auth, updatePlan);
router.post("/calculate-price", calculatePrice);
router.post("/subscribe", auth, subscribe);
router.post("/change-plan", auth, changePlan);
router.post("/unsubscribe", auth, unsubscribe);
router.post("/renew", auth, renewSubscription);
router.get("/getsubscription", auth, getSubscriptions);
router.get("/check-status", auth, checkSubscriptionStatus);
router.get("/history", auth, getSubscriptionHistory);

export default router;