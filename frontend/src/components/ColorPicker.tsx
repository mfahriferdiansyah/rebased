import { Label } from "@/components/ui/label";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const predefinedColors = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#000000", // black
];

export const ColorPicker = ({ color, onChange }: ColorPickerProps) => {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-2">
      <Label className="text-sm text-muted-foreground">Color:</Label>
      <div className="flex items-center gap-1">
        {predefinedColors.map((presetColor) => (
          <button
            key={presetColor}
            onClick={() => onChange(presetColor)}
            className={`w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ${
              color === presetColor ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"
            }`}
            style={{ backgroundColor: presetColor }}
            title={presetColor}
          />
        ))}
        <div className="relative ml-1">
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 rounded-md border-2 border-border cursor-pointer"
            title="Custom color"
          />
        </div>
      </div>
    </div>
  );
};
