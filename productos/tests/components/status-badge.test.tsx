import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("renders on_track status", () => {
    render(<StatusBadge status="on_track" />);
    expect(screen.getByText("No prazo")).toBeInTheDocument();
  });

  it("renders at_risk status", () => {
    render(<StatusBadge status="at_risk" />);
    expect(screen.getByText("Em risco")).toBeInTheDocument();
  });

  it("renders off_track status", () => {
    render(<StatusBadge status="off_track" />);
    expect(screen.getByText("Atrasado")).toBeInTheDocument();
  });

  it("renders done status", () => {
    render(<StatusBadge status="done" />);
    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });

  it("applies correct color class for on_track", () => {
    const { container } = render(<StatusBadge status="on_track" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-700");
  });

  it("applies correct color class for off_track", () => {
    const { container } = render(<StatusBadge status="off_track" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-red-100");
    expect(badge.className).toContain("text-red-700");
  });
});
