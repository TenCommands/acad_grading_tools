# Contributing to This Project

Thank you for your interest in contributing! To maintain code quality, please read the following sections.

### ![](/.assets/git.png) Versioning
> [!NOTE]
> This project makes use of a unique versioning system. Epoch Semantic Versioning. This versioning system is intended to properly show the version differences in both changes and time. The format of this versioning system is as follows; MAJOR[YEAR].MINOR[MONTH].PATCH[DAY]
>
> Here is the breakdown for what this means:
> | MAJOR | This is the amount of major breaking or fundemental changes. |
> | :-: | :- |
> | **MINOR** | **These are the minor changes that won't affect users and that they don't need, such as new features. This resets to 0 with each new major increment.** |
> | **PATCH** | **These are bug fixes or issue closures. If you find a bug while making changes you do NOT need to create a new issue but you you DO need to increment the patch number when you fix them. This resets to 0 with each new minor increment.** |
> | **YEAR** | **This is the current year as of the date you are making this release. Our first release was in 2025 and as such the version used 25. Our second release was in 2026 and used 26.** |
> | **MONTH** | **The current month as of the date you are making this release. First release was in December and therefore the number used here was 12. In our second release it was January which meant we used 01.** |
> | **DAY** | **This is the current day of the month that you are making the release. Our first release was on the 11th so the number used was 11. Our next release was on the 13th so we used 13.** |
> 
> For the `YEAR`, `MONTH`, and `DAY`, parts of the versioning they should remain as two length numbers (ie; 05 or 13, but not 5). If you would be to make a new release on `March 8th, 2026`, with `4 patches` and `1 minor` change, and the previous version was `v126.202.113`, we can infer that the last version was release on `February 13th, 2026`, and had `1 patch`, after `2 minor` updates. The new version with `4 patches` and `1 minor` change would be `v126.303.008` because the minor changes override the patches. You can update the version number, but do not make a release unless it is truly needed.

> [!NOTE]
> Versions are seperate in the Google Sheets Macros and AutoLISP scripts. Please ensure to reflect the version in the variable defined at the top of the file.
> 
> [macros.gs:2](/appscripts/macros.gs#2)
> ```js
> const CURRENT_VERSION = "126.303.008";
> ```
> [app.lsp:1](/autolisp/app.lsp#1)
> ```lisp
> (setq VERSION "026.003.008")
> ```

### ![](/.assets/appscript.png) Google Sheets Macros
> [!IMPORTANT]
> The Google Sheets Macros are made with the provided Google App Script [macros.gs](/appscripts/macros.gs). I have done my absolute best to comment things to an extent that a complete beginner to programming could understand what is happening. I request that you do the same when you create your pull request.

### ![](/.assets/AutoLISP.png) AutoCAD AutoLISP
> [!IMPORTANT]
> Since AutoCAD requires the archane and desolate language Lisp from like the 60s, you will likely have to learn it unless you are a maniac and already know it. As of right now this part of the project is still in a pre-release state which means it has 0 major, minor, or patches. Major should remain 0 until it has a full release.