import React, { useEffect, useState } from "react";
import { useSubscription } from "../context/subscriptionContext";
import { updatePlanRequest, createPlanRequest } from "../api/subscriptions";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  TextField,
  Select,
  MenuItem,
  Button,
  Grid,
  Stack,
  Divider,
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PageHeader from "../components/ui/PageHeader";
import PageLayout from "../components/ui/PageLayout";

// Página para mantener los planes de suscripción manualmente
export default function AdminPlansPage() {
  const { plans, loadPlans } = useSubscription();
  const [localPlans, setLocalPlans] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "Basic",
    price: "",
    durationInMonths: 1,
    isActive: true,
    features: [],
    basePrice: "",
    pricePerAdmin: "",
    pricePerProfessional: "",
    pricePerAssistant: "",
  });

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    setLocalPlans(plans.map((p) => ({ ...p }))); // copia editable
  }, [plans]);

  const handleChangeField = (id, field, value) => {
    setLocalPlans((prev) =>
      prev.map((plan) =>
        plan._id === id
          ? {
              ...plan,
              [field]:
                field === "isActive"
                  ? value
                  : [
                      "price",
                      "durationInMonths",
                      "basePrice",
                      "pricePerAdmin",
                      "pricePerProfessional",
                      "pricePerAssistant",
                    ].includes(field)
                  ? value === "" ? "" : Number(value)
                  : value,
            }
          : plan
      )
    );
  };

  const handleSave = async (plan) => {
    try {
      setSavingId(plan._id);
      const payload = {
        price: plan.price,
        durationInMonths: plan.durationInMonths,
        features: plan.features,
        isActive: plan.isActive,
      };

      if (plan.name === "Teams") {
        payload.basePrice = plan.basePrice;
        payload.pricePerAdmin = plan.pricePerAdmin;
        payload.pricePerProfessional = plan.pricePerProfessional;
        payload.pricePerAssistant = plan.pricePerAssistant;
      }

      await updatePlanRequest(plan._id, payload);
      await loadPlans();
      alert("Plan actualizado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el plan");
    } finally {
      setSavingId(null);
    }
  };

  const handleChangeNewPlan = (field, value) => {
    setNewPlan((prev) => ({
      ...prev,
      [field]:
        field === "isActive"
          ? value
          : [
              "price",
              "durationInMonths",
              "basePrice",
              "pricePerAdmin",
              "pricePerProfessional",
              "pricePerAssistant",
            ].includes(field)
          ? value === "" ? "" : Number(value)
          : value,
    }));
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const payload = {
        name: newPlan.name,
        price: newPlan.price,
        durationInMonths: newPlan.durationInMonths,
        isActive: newPlan.isActive,
        features: newPlan.features,
      };

      if (newPlan.name === "Teams") {
        payload.basePrice = newPlan.basePrice;
        payload.pricePerAdmin = newPlan.pricePerAdmin;
        payload.pricePerProfessional = newPlan.pricePerProfessional;
        payload.pricePerAssistant = newPlan.pricePerAssistant;
      }

      await createPlanRequest(payload);
      await loadPlans();
      setNewPlan({
        name: "Basic",
        price: "",
        durationInMonths: 1,
        isActive: true,
        features: [],
        basePrice: "",
        pricePerAdmin: "",
        pricePerProfessional: "",
        pricePerAssistant: "",
      });
      alert("Plan creado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al crear el plan");
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageLayout maxWidth={1100}>
      <PageHeader
        icon={<CreditCardIcon />}
        title="Administrar planes de suscripción"
        subtitle="Usa esta página solo para mantenimiento interno. Puedes crear, activar/desactivar y ajustar precios y duración de los planes. Para el plan Teams también puedes configurar los precios por tipo de usuario."
      />

      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Crear nuevo plan
              </Typography>
              <Stack spacing={2}>
                <Select
                  labelId="new-plan-name-label"
                  value={newPlan.name}
                  onChange={(e) => handleChangeNewPlan("name", e.target.value)}
                  fullWidth
                >
                  <MenuItem value="Basic">Basic</MenuItem>
                  <MenuItem value="Standard">Standard</MenuItem>
                  <MenuItem value="Teams">Teams</MenuItem>
                </Select>

                <TextField
                  label="Precio mensual (price)"
                  type="number"
                  value={newPlan.price}
                  onChange={(e) => handleChangeNewPlan("price", e.target.value)}
                  fullWidth
                />

                <TextField
                  label="Duración (meses)"
                  type="number"
                  value={newPlan.durationInMonths}
                  onChange={(e) => handleChangeNewPlan("durationInMonths", e.target.value)}
                  fullWidth
                />

                <Select
                  value={newPlan.isActive ? "true" : "false"}
                  onChange={(e) => handleChangeNewPlan("isActive", e.target.value === "true")}
                  fullWidth
                >
                  <MenuItem value="true">Activo</MenuItem>
                  <MenuItem value="false">Inactivo</MenuItem>
                </Select>

                {newPlan.name === "Teams" && (
                  <>
                    <TextField
                      label="Base price"
                      type="number"
                      value={newPlan.basePrice}
                      onChange={(e) => handleChangeNewPlan("basePrice", e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Precio por admin"
                      type="number"
                      value={newPlan.pricePerAdmin}
                      onChange={(e) => handleChangeNewPlan("pricePerAdmin", e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Precio por profesional"
                      type="number"
                      value={newPlan.pricePerProfessional}
                      onChange={(e) => handleChangeNewPlan("pricePerProfessional", e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Precio por asistente"
                      type="number"
                      value={newPlan.pricePerAssistant}
                      onChange={(e) => handleChangeNewPlan("pricePerAssistant", e.target.value)}
                      fullWidth
                    />
                  </>
                )}

                <TextField
                  label="Features (una por línea)"
                  multiline
                  minRows={4}
                  value={Array.isArray(newPlan.features) ? newPlan.features.join("\n") : ""}
                  onChange={(e) =>
                    handleChangeNewPlan(
                      "features",
                      e.target.value.split("\n").filter((l) => l.trim() !== "")
                    )
                  }
                  fullWidth
                />
              </Stack>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? "Creando..." : "Crear plan"}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Planes existentes
              </Typography>
              {!localPlans.length ? (
                <Typography variant="body2" color="text.secondary">
                  No hay planes configurados todavía. Crea el primero usando el
                  formulario de la izquierda.
                </Typography>
              ) : (
                <Stack spacing={2} divider={<Divider flexItem />}>
                  {localPlans.map((plan) => (
                    <Box key={plan._id}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {plan.name}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Precio mensual (price)"
                            type="number"
                            value={plan.price ?? ""}
                            onChange={(e) =>
                              handleChangeField(plan._id, "price", e.target.value)
                            }
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Duración (meses)"
                            type="number"
                            value={plan.durationInMonths ?? ""}
                            onChange={(e) =>
                              handleChangeField(
                                plan._id,
                                "durationInMonths",
                                e.target.value
                              )
                            }
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Select
                            value={plan.isActive ? "true" : "false"}
                            onChange={(e) =>
                              handleChangeField(
                                plan._id,
                                "isActive",
                                e.target.value === "true"
                              )
                            }
                            fullWidth
                          >
                            <MenuItem value="true">Activo</MenuItem>
                            <MenuItem value="false">Inactivo</MenuItem>
                          </Select>
                        </Grid>
                      </Grid>

                      {plan.name === "Teams" && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Base price"
                              type="number"
                              value={plan.basePrice ?? ""}
                              onChange={(e) =>
                                handleChangeField(
                                  plan._id,
                                  "basePrice",
                                  e.target.value
                                )
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Precio por admin"
                              type="number"
                              value={plan.pricePerAdmin ?? ""}
                              onChange={(e) =>
                                handleChangeField(
                                  plan._id,
                                  "pricePerAdmin",
                                  e.target.value
                                )
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Precio por profesional"
                              type="number"
                              value={plan.pricePerProfessional ?? ""}
                              onChange={(e) =>
                                handleChangeField(
                                  plan._id,
                                  "pricePerProfessional",
                                  e.target.value
                                )
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Precio por asistente"
                              type="number"
                              value={plan.pricePerAssistant ?? ""}
                              onChange={(e) =>
                                handleChangeField(
                                  plan._id,
                                  "pricePerAssistant",
                                  e.target.value
                                )
                              }
                              fullWidth
                            />
                          </Grid>
                        </Grid>
                      )}

                      <TextField
                        label="Features (una por línea)"
                        multiline
                        minRows={3}
                        sx={{ mt: 1 }}
                        value={Array.isArray(plan.features) ? plan.features.join("\n") : ""}
                        onChange={(e) =>
                          handleChangeField(
                            plan._id,
                            "features",
                            e.target.value
                              .split("\n")
                              .filter((l) => l.trim() !== "")
                          )
                        }
                        fullWidth
                      />

                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleSave(plan)}
                          disabled={savingId === plan._id}
                        >
                          {savingId === plan._id ? "Guardando..." : "Guardar"}
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageLayout>
  );
}
