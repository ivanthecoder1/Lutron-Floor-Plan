"use client";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase";
import styles from "./page.module.css";
import { useUploadPdf } from "../hooks/useUploadPdf";
import { useDeleteDocument } from "../hooks/useDeleteDocument";
import { useStarredFile } from "../hooks/useStarredFiles"
import { useRouter } from "next/navigation";
import useAuthRedirect from "../hooks/useAuthRedirect";
import { useUserFiles } from '../hooks/useUserFiles';
import { FloorPlanDocument } from '../interfaces/FloorPlanDocument';
import { useUpdateFileName } from '../hooks/useUpdateFileName';
import { Search, Star, Users, HomeIcon, User, LogOut, Book } from "lucide-react";
import Spinner from "../components/Spinner";
import { useFolders } from '../hooks/useFolders';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import ShareButton from "../components/ShareButton";
import Menu from "../components/Menu";
import AddFolderButton from "../components/AddFolderButton";


import * as pdfjsLib from 'pdfjs-dist/build/pdf'; // Import the PDF.js library
import 'pdfjs-dist/build/pdf.worker.entry';

export default function Home() {
	const [pdfFile, setPdfFile] = useState<File | null>(null);
	const { uploadPdf, uploading, error } = useUploadPdf();
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
	const { folders, loading: loadingFolders, createFolder, deleteFolder, fetchFolders } = useFolders();
	const [filterCondition, setFilterCondition] = useState<string>("Home"); // Default is home
	const { floorPlans, loading, fetchFloorPlans } = useUserFiles(selectedFolder, filterCondition);
	const { updateStarredFloorplan } = useStarredFile();
	const { deleteDocument, isDeleting, error: deleteError } = useDeleteDocument();
	const { isLoading } = useAuthRedirect();
	const [showThreeDotPopup, setShowThreeDotPopup] = useState(false);
	const [selectedFileId, setSelectedFileId] = useState(String);
	const router = useRouter();
	const [openSpinner, setOpeningSpinner] = useState(false);

	const [isRenaming, setIsRenaming] = useState(false);
	const [docToRename, setDocToRename] = useState<string | null>(null);
	const [newName, setNewName] = useState('');
	const { updateFileName } = useUpdateFileName();
	const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([{ id: "4", name: "Home" },]); // Keeps track of the folder path

	const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({}); // Store thumbnails
	const [searchTerm, setSearchTerm] = useState(''); // Store search terms for the search bar
	const [refreshTrigger, setRefreshTrigger] = useState(false);

	const [currentUser, setCurrentUser] = useState<string | null>(null);

	// Call this function whenever a floor plan field changes
	const refreshFloorPlans = () => setRefreshTrigger(prev => !prev);


	// Functions for switching between home, recent, starred, and sharred
	const handleClickFilterOptions = (filterParameter: string) => {
		setFilterCondition(filterParameter); 
		setSelectedFolder(null); 
	};

	// Ensure `fetchFloorPlans` is called whenever `filterByContributors` or `selectedFolder` changes
	useEffect(() => {
		fetchFloorPlans(); // Fetch files when the filter or folder changes
	}, [filterCondition, selectedFolder, refreshTrigger]);

	// Removes the border around the home page
	useEffect(() => {
		document.body.style.margin = "0";
		document.body.style.padding = "0";
		document.body.style.boxSizing = "border-box";
		document.body.style.background = "#F9F9F9";
	
		return () => {
		  document.body.style.margin = "";
		  document.body.style.padding = "";
		  document.body.style.boxSizing = "";
		  document.body.style.background = "";
		};
	  }, []);

	// Function to render PDF thumbnail
	const renderThumbnail = async (pdfUrl: string) => {
		try {
			const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
			const page = await pdf.getPage(1); // Get the first page
			const scale = 0.5;
			const viewport = page.getViewport({ scale });

			// Create canvas and draw the page as an image
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			canvas.height = viewport.height;
			canvas.width = viewport.width;

			const renderContext = {
				canvasContext: context!,
				viewport,
			};

			await page.render(renderContext).promise;

			// Convert canvas to image URL
			const thumbnailUrl = canvas.toDataURL();
			return thumbnailUrl;
		} catch (error) {
			console.error('Error rendering PDF thumbnail:', error);
			return null;
		}
	};

	useEffect(() => {
		const generateThumbnails = async () => {
			const thumbnailsData: { [key: string]: string } = {};
			for (const file of floorPlans) {
				if (file.pdfURL) {
					const thumbnailUrl = await renderThumbnail(file.pdfURL);
					if (thumbnailUrl) {
						thumbnailsData[file.id] = thumbnailUrl;
					}
				}
			}
			setThumbnails(thumbnailsData);
		};

		generateThumbnails();
	}, [floorPlans]);

	const signOutWithGoogle = async () => {
		try {
			await signOut(auth);
		} catch (err) {
			console.error(err);
		}
	};

	//renamed from uploadFloorplan
	const handleFileChange = async (event: any) => {
		const file = event.target.files[0];
		if (file && file.type === "application/pdf") {
			setPdfFile(file);

			const folderId = selectedFolder || "4"; // Default to "4" (Home folder) if no folder is selected
			const result = await uploadPdf(file, folderId); // Upload the PDF and get both pdfURL and documentId
			if (result) {
				const { pdfURL, documentId } = result;
				// Redirect to the editor page, passing the PDF URL and documentId
				router.push(`/editor?pdf=${encodeURIComponent(pdfURL)}&documentID=${documentId}&fileName=${encodeURIComponent(file.name)}`);
			} else {
				alert("Failed to upload PDF.");
			}
		}
	};

	// Opening existing floor plans
	const openFloorplan = (pdfURL: string, documentID: string, fileName: string) => {
		setOpeningSpinner(true);
		const encodedFolderPath = encodeURIComponent(JSON.stringify(folderPath));
		router.push(`/editor?pdf=${encodeURIComponent(pdfURL)}&documentID=${documentID}&fileName=${encodeURIComponent(fileName)}&folderPath=${encodedFolderPath}`);
	};

	// Function to update the folderID of a file in Firestore
	const updateFileFolder = async (fileId: string, folderID: string) => {
		try {
		  const fileRef = doc(db, "FloorPlans", fileId);
		  await updateDoc(fileRef, { folderID });
		  console.log(`File ${fileId} moved to folder ${folderID}`);
		  console.log('moved!');
		} catch (error) {
		  console.error("Failed to update file folder:", error);
		  throw new Error("Failed to update file folder.");
		}
	};
	

	const handleDrop = async (event: React.DragEvent<HTMLDivElement>, folderID: string) => {
		event.preventDefault();
		const fileId = event.dataTransfer.getData('fileId'); // Get the dragged file ID
	  
		console.log(`Moving file ${fileId} to folder ${folderID}`);
	  
		if (fileId) {
		  try {
			// Update Firestore
			await updateFileFolder(fileId, folderID);
	  
			// Explicitly refresh floor plans
			fetchFloorPlans();
		  } catch (err) {
			console.error("Failed to move file:", err);
			alert("Failed to move file.");
		  }
		}
	};
	  

	const handleFolderClick = (folderID: string, folderName: string) => {
		setSelectedFolder(folderID);  // Set the selected folder ID to display its contents
		fetchFolders(folderID);  // Fetch subfolders inside the selected folder
		fetchFloorPlans(); // Fetch files inside the selected folder
		setFolderPath((prevPath) => [...prevPath, { id: folderID, name: folderName }]); // Add the new folder to the path
	};

	const handleBackClick = () => {
		const newPath = [...folderPath];
		newPath.pop(); // Remove the last folder from the path
		const lastFolder = newPath[newPath.length - 1]; // Get the new last folder
		setSelectedFolder(lastFolder.id); // Set the selected folder to the last one
		fetchFolders(lastFolder.id); // Fetch the contents of the last folder
		setFolderPath(newPath); // Update the folder path
	};

	const handleDragStart = (event: React.DragEvent<HTMLDivElement>, fileId: string) => {
		event.dataTransfer.setData('fileId', fileId); // Save the dragged file ID
	};

	const handleBreadcrumbClick = (folderID: string) => {
		// Find the folder's index in the folderPath array
		const clickedFolderIndex = folderPath.findIndex(folder => folder.id === folderID);

		// Remove all folders after the clicked folder
		const newFolderPath = folderPath.slice(0, clickedFolderIndex + 1);

		setSelectedFolder(folderID);  // Set the selected folder ID to display its contents
		fetchFolders(folderID);  // Fetch subfolders inside the selected folder
		fetchFloorPlans(); // Fetch files inside the selected folder
		setFolderPath(newFolderPath);  // Update the folder path to only include folders up to this one
	};

	const handleDropOnBreadcrumb = async (event: React.DragEvent, targetfolderID: string) => {
		event.preventDefault();
		const fileId = event.dataTransfer.getData("fileId");  // Get the file ID from the drag event

		if (fileId) {
			try {
				// Update the file's folderID to the target folder in Firestore
				await updateFileFolder(fileId, targetfolderID);
				fetchFloorPlans();  // Refresh the file list after moving the file
			} catch (err) {
				console.error("Failed to move file:", err);
				alert("Failed to move file.");
			}
		}
	};

	const handleCreateFolder = async (folderName: string) => {
        const parentfolderId = selectedFolder || "4"; // Default folder ID if none selected
        await createFolder(folderName, parentfolderId);
        fetchFolders(parentfolderId); // Refresh the folder list
    };

	// Creates a pop up when user tries to delete a floor plan
	// Askes if they want to proceed
	const handleDeleteFloorPlan = async (id: string) => {
		if (window.confirm("Are you sure you want to delete this file?")) {
			try {
				await deleteDocument(id);
				refreshFloorPlans() // Refreshes floorplans after successful deletion
			} catch (error) {
				console.error("Failed to delete the floor plan:", error);
				alert("Failed to delete the floor plan.");
			}
		}
	};

	// Display pop up menu when clicking on three dot icon
	const handleThreeDotPopup = (id: string) => {
		// Check if the currently selected file ID is the same as the clicked one and if the popup is shown
		if (selectedFileId === id && showThreeDotPopup) {
			setShowThreeDotPopup(false); // Hide the popup if it's already shown for the same file ID
		} else {
			setSelectedFileId(id); // Set the new file ID
			setShowThreeDotPopup(true); // Show the popup
		}
	};

	// Truncate a floor plan name
	const truncateFloorPlanName = (name: string | undefined) => {
		if (!name) return 'Unnamed File'; // Handle undefined or empty names
		return name.length > 10 ? `${name.substring(0, 7)}...` : name;
	};

	const startRenaming = (docId: string, currentName?: string) => {
		setIsRenaming(true);
		setDocToRename(docId);
		setNewName(currentName || ''); // Pre-fill with current name if available
	};

	const cancelRenaming = () => {
		setIsRenaming(false);
		setDocToRename(null);
	};

	// Changes the new name in firebase and on screen
	const submitNewName = async () => {
		if (docToRename && newName) {
			await updateFileName(docToRename, newName);
			setIsRenaming(false);
			setDocToRename(null);
			// Optionally refresh the list of floor plans to show the updated name
			await fetchFloorPlans();
		}
	};

	// Hide three dot pop up menu when you hover away
	const handleMouseLeave = () => {
		setShowThreeDotPopup(false);
	};

	// Handle starring floorplans
	const handleStarredFloorplans = async (documentId: string, isCurrentlyStarred: boolean) => {
		let newStarredState = !isCurrentlyStarred;
		await updateStarredFloorplan(documentId, newStarredState);
		// Trigger a refresh to re-fetch updated floor plans from the server
		refreshFloorPlans();
	};

	const handleRenameFolder = (folderId: string) => {
		// Placeholder function to handle renaming folders
		console.log(`Rename folder with ID: ${folderId}`);
		// Add your renaming logic here (e.g., prompt for new folder name, update in database)
	};
	const handleMoveFolder = (folderId: string) => {
    // Placeholder function to handle moving folders
    console.log(`Move folder with ID: ${folderId}`);
    // Add your moving logic here (e.g., select target folder, update in database)
	};

	const handleDeleteFolder = (folderId: string) => {
		// Placeholder function to delete  folders
		console.log(`Delete folder with ID: ${folderId}`);
		// Add your delete logic here (e.g., select target folder, update in database)
		};


	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const folderParam = params.get('folder');
		const folderPathParam = params.get('folderPath');

		if (folderParam) {
			setSelectedFolder(folderParam);
			fetchFolders(folderParam);
		}

		if (folderPathParam) {
			try {
				const pathData = JSON.parse(decodeURIComponent(folderPathParam));
				setFolderPath(pathData);
			} catch (error) {
				console.error('Error parsing folder path:', error);
			}
		}
	}, []);

	useEffect(() => {
		const user = auth.currentUser;
		setCurrentUser(user?.email || 'Guest User');
	}, []);

	const filteredFloorPlans = floorPlans.filter((file) => 
		file.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		file.creatorEmail?.toLowerCase().includes(searchTerm.toLowerCase())
	);
	
	return (
		<div className={styles.container}>
			<div className={styles.userProfile}>
				<User size={18} />
				<span>{currentUser}</span>
			</div>
			{(uploading || loading || isDeleting || openSpinner) && <Spinner />}
			<>
				<aside className={styles.sidebar}>
					<img className={styles.lutronLogo} src="https://umslogin.lutron.com/Content/Dynamic/Default/Images/logo-lutron-blue.svg" alt="Lutron Logo" />
					<h4>Floor Plan Application</h4>
					<nav className={styles.navigation} id="navSidebar">
						<button
							className={`${styles.navButton} ${filterCondition === "Home" ? styles.active : ""}`}
							onClick={() => handleClickFilterOptions("Home")}
						>
							<HomeIcon size={22} /> Home
						</button>
						<button
							className={`${styles.navButton} ${filterCondition === "Shared" ? styles.active : ""}`}
							onClick={() => handleClickFilterOptions("Shared")}
						>
							<Users size={22} /> Shared with me
						</button>
						<button
							className={`${styles.navButton} ${filterCondition === "Starred" ? styles.active : ""}`}
							onClick={() => handleClickFilterOptions("Starred")}
						>
							<Star size={22} /> Starred
						</button>
					</nav>
					<button
						className={styles.navButton}
						onClick={() => window.open('/user-guide.pdf', '_blank')}
					>
						<Book size={22} /> User Manual
					</button>
					<button className={styles.navButton} onClick={signOutWithGoogle}>
						<LogOut size={22} /> Logout
					</button>
				</aside>

				<main className={styles.mainContent}>
					{/* Breadcrumb Navigation with Drag-and-Drop */}
					<div className={styles.breadcrumb}>
						{folderPath.map((folder, index) => (
							<span key={folder.id}>
								{index < folderPath.length - 1 ? (
									<button
										className={styles.breadcrumbButton}
										onClick={() => handleBreadcrumbClick(folder.id)}
										onDragOver={(e) => e.preventDefault()}
										onDrop={(e) => handleDropOnBreadcrumb(e, folder.id)}
									>
										{folder.name}
									</button>
								) : (
									<span className={styles.breadcrumbLast}>{folder.name}</span>
								)}
								{index < folderPath.length - 1 && ' / '} {/* Display a separator between items */}
							</span>
						))}
					</div>

					{/* Back Button and Folder Name Display */}
					{folderPath.length > 1 && (
						<div className={styles.folderNavigation}>
						</div>
					)}

					<div className={styles.searchBar}>
						<Search className={styles.searchIcon} />
						<input
							type="text"
							placeholder="Search floor plans"
							className={styles.searchInput}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
		
					<div className={styles.folderList}>
						{filterCondition === "Home" && (
							<>
							<div className={styles.newOptionsSection}>
								<AddFolderButton onCreateFolder={handleCreateFolder} />
							</div>
							{loadingFolders ? (
								<div>Loading folders...</div>
							) : (
								folders.map((folder) => (
								<div
									key={folder.id}
									className={styles.folderItem}
									onDragOver={(e) => e.preventDefault()} // Allow dragging over the folder
									onDrop={(e) => handleDrop(e, folder.id)} // Handle drop
								>
									<span onClick={() => handleFolderClick(folder.id, folder.name)}>{folder.name}</span>
									<Menu
									onRename={() => console.log(`Rename folder: ${folder.name}`)}
									onDelete={() => console.log(`Delete folder: ${folder.name}`)}
									onMove={() => console.log(`Move folder: ${folder.name}`)}
									/>
								</div>
								))
							)}
							</>
						)}
					</div>


					{filteredFloorPlans.length > 0 && (
						<div className={styles.prompt}>
							Double click on a floor plan to open them in the editor page
						</div>
					)}

					<div className={styles.fileList}>
					{filterCondition === "Home" && (
						<div className={styles.fileItem}>
							<button
								className={styles.importButton}
								onClick={() => document.getElementById("fileInput")?.click()}
							>
								Click to import a floor plan (PDF Format)
							</button>
							<input
								type="file"
								id="fileInput"
								style={{ display: 'none' }}
								onChange={handleFileChange}
							/>
						</div>
					)}
						{filteredFloorPlans.map((file: FloorPlanDocument) => (
						<div
							key={file.id}
							className={styles.fileItem}
							draggable // Make the file draggable
							onDragStart={(event) => handleDragStart(event, file.id)} // Handle drag start
							onDoubleClick={() => openFloorplan(file.pdfURL, file.id, file.name || 'Untitled')}
							onMouseLeave={handleMouseLeave}
						>
							{/* Three-dot button */}
							<button className={styles.threeDotButton} onClick={() => handleThreeDotPopup(file.id)}>
							<img
								className={styles.threeDotLogo}
								src="https://cdn.icon-icons.com/icons2/2645/PNG/512/three_dots_vertical_icon_159806.png"
								alt="three-dots-icon"
							/>
							</button>

							<div className={styles.fileName}>
							{truncateFloorPlanName(file.name)}
							<div className={styles.fileNamePopup}>{file.name}</div>
							</div>
							<button
							className={styles.starButton}
							onClick={() => handleStarredFloorplans(file.id, file.starred)}
							>
							<Star fill={file.starred ? "yellow" : "white"} color="black" />
							</button>
							<img src={thumbnails[file.id] || 'loading'} alt="PDF Thumbnail" className={styles.thumbnail} />
							<div className={styles.creatorInfo}>{file.creatorEmail || 'Unknown Creator'}</div>

							{/* Popup Menu */}
							{showThreeDotPopup && selectedFileId === file.id && (
							isRenaming && docToRename === file.id ? (
								<>
								<input value={newName} onChange={(e) => setNewName(e.target.value)} />
								<button onClick={submitNewName}>Save</button>
								<button onClick={cancelRenaming}>Cancel</button>
								</>
							) : (
								<div className={styles.popupMenu} onMouseLeave={handleMouseLeave}>
								<ShareButton fileId={file.id} />
								<button onClick={() => startRenaming(file.id!, file.name)}>Rename</button>
								<button onClick={() => handleDeleteFloorPlan(file.id)}>Delete</button>
								</div>
							)
							)}
						</div>
						))}
					</div>
				</main>
			</>
		</div>
	);
}
