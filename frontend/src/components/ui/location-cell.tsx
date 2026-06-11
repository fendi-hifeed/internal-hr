import { MapPin, ExternalLink } from "lucide-react";
import { formatGeoCoords, getGoogleMapsLink } from "@/lib/utils";

interface LocationCellProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  /** Show location name above the coordinates. Default: true */
  showName?: boolean;
  /** Open maps in new tab. Default: true */
  external?: boolean;
  className?: string;
}

export function LocationCell({
  latitude,
  longitude,
  locationName,
  showName = true,
  external = true,
  className = "",
}: LocationCellProps) {
  if (latitude == null || longitude == null) {
    return (
      <span className="text-muted-foreground text-xs">—</span>
    );
  }

  const coords = formatGeoCoords(latitude, longitude);
  const mapsLink = getGoogleMapsLink(latitude, longitude);

  return (
    <div className={`flex items-start gap-1.5 ${className}`}>
      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex flex-col min-w-0">
        {showName && locationName && (
          <span className="text-xs text-muted-foreground line-clamp-1" title={locationName}>
            {locationName}
          </span>
        )}
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-muted-foreground font-medium">
            {coords}
          </span>
          {external && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka di Google Maps"
              className="text-blue-500 hover:text-blue-700 shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}