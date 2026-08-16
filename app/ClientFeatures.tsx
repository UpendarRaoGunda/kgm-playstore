"use client";

import dynamic from "next/dynamic";

const CommunityGallery = dynamic(() => import("./CommunityGalleryV3"), { ssr: false });
const CommunityShelf = dynamic(() => import("./CommunityShelf"), { ssr: false });
const VillageChat = dynamic(() => import("./VillageChat"), { ssr: false });
const KgmVideoChat = dynamic(() => import("./KgmVideoChat"), { ssr: false });
const ScienceCinema = dynamic(() => import("./ScienceCinema"), { ssr: false });
const ScienceCinemaDrive = dynamic(() => import("./ScienceCinemaDrive"), { ssr: false });
const CinemaLegalMovies = dynamic(() => import("./CinemaLegalMovies"), { ssr: false });
const CinemaPosterSourceEnhancer = dynamic(() => import("./CinemaPosterSourceEnhancer"), { ssr: false });
const CinemaCategoryScroller = dynamic(() => import("./CinemaCategoryScroller"), { ssr: false });
const ProfileEditor = dynamic(() => import("./ProfileEditor"), { ssr: false });
const KgmAiTutor = dynamic(() => import("./KgmAiTutor"), { ssr: false });
const MusicLibraryManager = dynamic(() => import("./MusicLibraryManager"), { ssr: false });
const PwaManager = dynamic(() => import("./PwaInstall"), { ssr: false });

export default function ClientFeatures() {
  return <>
    <CommunityShelf />
    <MusicLibraryManager />
    <CommunityGallery />
    <VillageChat />
    <KgmVideoChat />
    <ScienceCinema />
    <ScienceCinemaDrive />
    <CinemaLegalMovies />
    <CinemaPosterSourceEnhancer />
    <CinemaCategoryScroller />
    <ProfileEditor />
    <KgmAiTutor />
    <PwaManager />
  </>;
}
