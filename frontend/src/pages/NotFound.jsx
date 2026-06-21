import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-px py-20">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={<Button as={Link} to="/">Go home</Button>}
      />
    </div>
  );
}
