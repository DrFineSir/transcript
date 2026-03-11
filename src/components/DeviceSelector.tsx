import type { AudioDevice } from "../lib/types";

interface DeviceSelectorProps {
  devices: AudioDevice[];
  selectedDeviceId: string;
  onSelect: (deviceId: string) => void;
  disabled: boolean;
}

export function DeviceSelector({
  devices,
  selectedDeviceId,
  onSelect,
  disabled,
}: DeviceSelectorProps) {
  const hasDevices = devices.length > 0;

  return (
    <div className="relative flex items-center gap-2">
      <label
        htmlFor="device-select"
        className="shrink-0 text-xs font-medium uppercase tracking-wider text-zinc-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="inline-block h-4 w-4 mr-1 -mt-0.5"
        >
          <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
          <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
        </svg>
        Mic
      </label>

      <div className="relative">
        <select
          id="device-select"
          value={selectedDeviceId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled || !hasDevices}
          className={[
            "appearance-none rounded-lg border border-zinc-700/60 bg-zinc-800/70 pl-3 pr-8 py-2",
            "text-sm text-zinc-200 shadow-sm backdrop-blur-sm",
            "transition-all duration-200 ease-out",
            "hover:border-zinc-600 hover:bg-zinc-800/90",
            "focus:border-indigo-500/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
            "disabled:cursor-not-allowed disabled:opacity-40",
            "min-w-[180px] max-w-[280px] truncate",
          ].join(" ")}
        >
          {!hasDevices ? (
            <option value="">No devices found</option>
          ) : (
            devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))
          )}
        </select>

        {/* Custom dropdown chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
