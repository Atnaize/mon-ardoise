import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

const navigation = createNavigation(routing);

export const Link = navigation.Link;
export const usePathname = navigation.usePathname;
export const useRouter = navigation.useRouter;
export const getPathname = navigation.getPathname;

export const redirect: typeof navigation.redirect = navigation.redirect;
export const permanentRedirect: typeof navigation.permanentRedirect = navigation.permanentRedirect;
