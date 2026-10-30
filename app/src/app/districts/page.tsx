import { DistrictTable } from "@/components/DistrictTable";
import { PageHeader } from "@/components/ui";
import { getDistricts } from "@/lib/data";

export default function DistrictsPage() {
  return (
    <>
      <PageHeader
        title="Districts"
        subtitle="All districts ranked by gap score. Sort any column, filter by province or sector, select rows and export them."
      />
      <DistrictTable districts={getDistricts()} />
    </>
  );
}
