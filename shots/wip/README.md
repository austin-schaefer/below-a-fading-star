# Work-in-progress screenshots (the agents' inbox)

Agents write every render they take here, named `<module>-<stage>-<view>.png` (see the project README). This folder is an inbox, not an archive: at each merge the orchestrator curates the best renders into `../` (flat, named `<stage NN>-<subject>-<view>[-before|-after]`, indexed in `../README.md`) and removes the rest with `git rm`, so history keeps the originals. Anything left here is awaiting curation.
