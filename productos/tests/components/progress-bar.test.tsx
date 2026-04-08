import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/shared/progress-bar";

describe("ProgressBar", () => {
  it("renders with correct aria attributes", () => {
    render(<ProgressBar value={50} max={100} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps value to 0-100%", () => {
    const { rerender } = render(<ProgressBar value={150} max={100} />);
    let bar = screen.getByRole("progressbar");
    expect(bar).toHaveStyle({ width: "100%" });

    rerender(<ProgressBar value={-10} max={100} />);
    bar = screen.getByRole("progressbar");
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("shows label when showLabel=true", () => {
    render(<ProgressBar value={75} max={100} showLabel />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("does not show label by default", () => {
    render(<ProgressBar value={75} max={100} />);
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
  });

  it("calculates percentage correctly with custom max", () => {
    render(<ProgressBar value={1} max={4} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveStyle({ width: "25%" });
  });
});
