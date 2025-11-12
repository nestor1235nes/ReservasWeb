import { Stack, Typography, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

function getRules(password) {
  return {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

const entries = [
  { key: "length", label: "Al menos 6 caracteres" },
  { key: "uppercase", label: "Al menos una letra mayúscula (A-Z)" },
  { key: "number", label: "Al menos un número (0-9)" },
  { key: "symbol", label: "Al menos un símbolo (por ejemplo: !, @, #)" },
];

export default function PasswordRequirements({ password = "" }) {
  const rules = getRules(password);

  return (
    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        La contraseña debe cumplir con:
      </Typography>
      <List dense sx={{ py: 0 }}>
        {entries.map((e) => {
          const ok = rules[e.key];
          return (
            <ListItem key={e.key} sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {ok ? (
                  <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />
                ) : (
                  <CancelIcon fontSize="small" sx={{ color: "text.disabled" }} />
                )}
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ variant: "caption", color: ok ? "text.primary" : "text.secondary" }}
                primary={e.label}
              />
            </ListItem>
          );
        })}
      </List>
    </Stack>
  );
}
