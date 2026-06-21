import Skeleton from "./ui/Skeleton";

export default function PropertyCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
        <Skeleton className="h-3 w-1/3 rounded-md" />
      </div>
    </div>
  );
}
